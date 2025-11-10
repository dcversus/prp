#!/bin/bash

# PRP MCP Server Deployment Script
# Automates deployment of PRP MCP server with Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCKER_REGISTRY="ghcr.io"
IMAGE_NAME="dcversus/prp"
DEFAULT_PORT="8080"
DEFAULT_HOST="0.0.0.0"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_help() {
    cat << EOF
PRP MCP Server Deployment Script

USAGE:
    $0 [COMMAND] [OPTIONS]

COMMANDS:
    deploy           Deploy MCP server to production
    deploy-dev       Deploy MCP server to development
    build            Build Docker image
    test             Test deployment
    logs             Show container logs
    stop             Stop MCP server
    restart          Restart MCP server
    clean            Clean up containers and images
    status           Show deployment status

OPTIONS:
    -p, --port <port>           Port to expose (default: 8080)
    -h, --host <host>           Host to bind to (default: 0.0.0.0)
    -e, --env <file>            Environment file to use
    --ssl                       Enable SSL
    --prod                      Use production configuration
    --dry-run                   Show commands without executing
    --help                      Show this help message

ENVIRONMENT VARIABLES:
    API_SECRET                  Required: JWT signing secret
    OPENAI_API_KEY              Optional: OpenAI API key
    ANTHROPIC_API_KEY           Optional: Anthropic API key
    GLM_API_KEY                 Optional: GLM API key
    NUDGE_SECRET                Optional: Nudge notification secret
    ADMIN_ID                    Optional: Admin ID for notifications

EXAMPLES:
    # Deploy to development
    $0 deploy-dev --port 8080

    # Deploy to production with SSL
    $0 deploy --prod --ssl --port 443

    # Build and test
    $0 build && $0 test

    # Show logs
    $0 logs

EOF
}

check_requirements() {
    log_info "Checking requirements..."

    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi

    # Check if Docker is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi

    # Check if docker-compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "docker-compose is not installed or not in PATH"
        exit 1
    fi

    log_success "All requirements met"
}

check_env_file() {
    local env_file="$1"

    if [[ -n "$env_file" && -f "$env_file" ]]; then
        log_info "Using environment file: $env_file"
        export "$(grep -v '^#' "$env_file" | xargs)"
    fi

    # Check required environment variables
    if [[ -z "$API_SECRET" ]]; then
        log_error "API_SECRET environment variable is required"
        log_info "You can set it in your environment file or export it:"
        log_info "export API_SECRET=\"your-secret-key\""
        exit 1
    fi

    log_success "Environment variables validated"
}

build_image() {
    local tag="$1"

    log_info "Building Docker image with tag: $tag"

    if [[ "$DRY_RUN" == "true" ]]; then
        echo "docker build -t $tag -f Dockerfile --target mcp-server ."
        return
    fi

    docker build -t "$tag" -f Dockerfile --target mcp-server .
    log_success "Docker image built successfully: $tag"
}

deploy_container() {
    local port="$1"
    local host="$2"
    local env_file="$3"
    local ssl="$4"
    local prod="$5"

    local container_name="prp-mcp-${prod:+prod}"
    local tag="$IMAGE_NAME:latest${prod:+-prod}"

    log_info "Deploying MCP server container: $container_name"

    # Stop and remove existing container if it exists
    if docker ps -a --format 'table {{.Names}}' | grep -q "^$container_name$"; then
        log_info "Stopping existing container: $container_name"
        docker stop "$container_name" || true
        docker rm "$container_name" || true
    fi

    # Prepare environment variables
    local env_vars=()
    env_vars+=("-e" "NODE_ENV=${prod:+production}${prod:-development}")
    env_vars+=("-e" "PORT=$port")
    env_vars+=("-e" "HOST=$host")
    env_vars+=("-e" "API_SECRET=$API_SECRET")

    # Add optional environment variables if set
    [[ -n "$OPENAI_API_KEY" ]] && env_vars+=("-e" "OPENAI_API_KEY=$OPENAI_API_KEY")
    [[ -n "$ANTHROPIC_API_KEY" ]] && env_vars+=("-e" "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY")
    [[ -n "$GLM_API_KEY" ]] && env_vars+=("-e" "GLM_API_KEY=$GLM_API_KEY")
    [[ -n "$NUDGE_SECRET" ]] && env_vars+=("-e" "NUDGE_SECRET=$NUDGE_SECRET")
    [[ -n "$ADMIN_ID" ]] && env_vars+=("-e" "ADMIN_ID=$ADMIN_ID")

    # CORS configuration
    local cors_origins="${CORS_ORIGINS:-*}"
    env_vars+=("-e" "CORS_ORIGINS=$cors_origins")

    # Prepare volume mounts
    local volumes=()
    volumes+=("-v" "$(pwd)/workspace:/workspace")
    volumes+=("-v" "$(pwd)/PRPs:/workspace/PRPs:ro")

    # Prepare ports
    local ports=()
    ports+=("-p" "${port}:${port}")

    if [[ "$ssl" == "true" ]]; then
        ports+=("-p" "443:443")
        env_vars+=("-e" "SSL_ENABLED=true")
    fi

    # Prepare docker command
    local docker_cmd=(
        docker run -d
        --name "$container_name"
        --restart unless-stopped
        "${env_vars[@]}"
        "${volumes[@]}"
        "${ports[@]}"
        "$tag"
    )

    if [[ "$DRY_RUN" == "true" ]]; then
        echo "${docker_cmd[*]}"
        return
    fi

    log_info "Starting container with command: ${docker_cmd[*]}"

    # Run the container
    local container_id
    container_id=$("${docker_cmd[@]}")

    if [[ -n "$container_id" ]]; then
        log_success "Container started successfully: $container_id"
        log_info "Container name: $container_name"
        log_info "Port: $port"
        log_info "Host: $host"

        # Wait for container to be ready
        log_info "Waiting for container to be ready..."
        sleep 5

        # Check container health
        if docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -q "$container_name.*Up"; then
            log_success "Container is running and healthy"

            # Show container information
            echo
            log_info "Container Information:"
            echo "  Name: $container_name"
            echo "  ID: $container_id"
            echo "  Port: $port"
            echo "  Host: $host"
            echo "  SSL: ${ssl:-disabled}"
            echo "  Environment: ${prod:+production}${prod:-development}"
            echo
            log_info "Access URLs:"
            echo "  Health: http://${host}:${port}/health"
            echo "  API: http://${host}:${port}/mcp"
            echo
            log_info "To view logs: $0 logs"
            log_info "To stop container: $0 stop"
        else
            log_error "Container failed to start properly"
            docker logs "$container_name"
            exit 1
        fi
    else
        log_error "Failed to start container"
        exit 1
    fi
}

test_deployment() {
    local port="$1"
    local host="$2"

    log_info "Testing deployment at http://${host}:${port}"

    # Test health endpoint
    log_info "Testing health endpoint..."
    if curl -f -s "http://${host}:${port}/health" > /dev/null; then
        log_success "Health endpoint is responding"
    else
        log_error "Health endpoint is not responding"
        return 1
    fi

    # Test MCP status endpoint (requires authentication)
    log_info "Testing MCP endpoint availability..."
    local status_code
    status_code=$(curl -s -o /dev/null -w "%{http_code}" "http://${host}:${port}/mcp/status" || echo "000")

    if [[ "$status_code" == "401" ]]; then
        log_success "MCP endpoint is responding (authentication required - this is expected)"
    elif [[ "$status_code" == "200" ]]; then
        log_warning "MCP endpoint is responding without authentication (check configuration)"
    else
        log_error "MCP endpoint returned unexpected status: $status_code"
        return 1
    fi

    log_success "Deployment tests passed"
}

show_status() {
    log_info "Checking deployment status..."

    local containers
    containers=$(docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep prp-mcp || true)

    if [[ -n "$containers" ]]; then
        echo "$containers"
        echo
        log_info "Active containers found"
    else
        log_warning "No PRP MCP containers are currently running"
    fi
}

show_logs() {
    local container_name="prp-mcp-prod"

    if docker ps --format '{{.Names}}' | grep -q "prp-mcp-dev"; then
        container_name="prp-mcp-dev"
    fi

    if docker ps --format '{{.Names}}' | grep -q "$container_name"; then
        log_info "Showing logs for container: $container_name"
        docker logs -f "$container_name"
    else
        log_error "No running MCP container found"
        exit 1
    fi
}

stop_container() {
    local container_name="prp-mcp-prod"

    if docker ps --format '{{.Names}}' | grep -q "prp-mcp-dev"; then
        container_name="prp-mcp-dev"
    fi

    if docker ps --format '{{.Names}}' | grep -q "$container_name"; then
        log_info "Stopping container: $container_name"
        docker stop "$container_name"
        docker rm "$container_name"
        log_success "Container stopped and removed"
    else
        log_warning "No running MCP container found"
    fi
}

restart_container() {
    stop_container
    sleep 2
    log_info "Restarting container..."
    # Restart with the same configuration - this would require storing the config
    # For now, just inform the user
    log_warning "To restart with the same configuration, run the deploy command again"
}

cleanup() {
    log_info "Cleaning up Docker resources..."

    # Stop all PRP MCP containers
    local containers
    containers=$(docker ps -aq --filter "name=prp-mcp" || true)

    if [[ -n "$containers" ]]; then
        log_info "Stopping and removing PRP MCP containers..."
        docker stop $containers || true
        docker rm $containers || true
    fi

    # Remove unused images
    log_info "Removing unused Docker images..."
    docker image prune -f || true

    log_success "Cleanup completed"
}

# Parse command line arguments
COMMAND=""
PORT="$DEFAULT_PORT"
HOST="$DEFAULT_HOST"
ENV_FILE=""
SSL="false"
PROD="false"
DRY_RUN="false"

while [[ $# -gt 0 ]]; do
    case $1 in
        deploy|deploy-dev|build|test|logs|stop|restart|clean|status)
            COMMAND="$1"
            shift
            ;;
        -p|--port)
            PORT="$2"
            shift 2
            ;;
        -h|--host)
            HOST="$2"
            shift 2
            ;;
        -e|--env)
            ENV_FILE="$2"
            shift 2
            ;;
        --ssl)
            SSL="true"
            shift
            ;;
        --prod)
            PROD="true"
            shift
            ;;
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Execute command
case $COMMAND in
    deploy|deploy-dev)
        check_requirements
        check_env_file "$ENV_FILE"

        if [[ "$COMMAND" == "deploy-dev" ]]; then
            PROD="false"
        else
            PROD="true"
        fi

        local tag="$IMAGE_NAME:latest${PROD:+-prod}"
        build_image "$tag"
        deploy_container "$PORT" "$HOST" "$ENV_FILE" "$SSL" "$PROD"

        if [[ "$DRY_RUN" != "true" ]]; then
            test_deployment "$PORT" "$HOST"
        fi
        ;;
    build)
        check_requirements
        local tag="$IMAGE_NAME:latest${PROD:+-prod}"
        build_image "$tag"
        ;;
    test)
        test_deployment "$PORT" "$HOST"
        ;;
    logs)
        show_logs
        ;;
    stop)
        stop_container
        ;;
    restart)
        restart_container
        ;;
    clean)
        cleanup
        ;;
    status)
        show_status
        ;;
    "")
        log_error "No command specified"
        show_help
        exit 1
        ;;
    *)
        log_error "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac