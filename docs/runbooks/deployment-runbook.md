# PRP CLI Deployment Runbook

## Overview

This runbook provides step-by-step procedures for deploying, managing, and troubleshooting the PRP CLI autonomous development orchestration system.

## Prerequisites

Before proceeding with deployment, ensure:

- [ ] Kubernetes cluster (v1.24+) is accessible
- [ ] kubectl is configured and authenticated
- [ ] Helm 3.8+ is installed
- [ ] Container registry access is configured
- [ ] Required secrets and configurations are prepared
- [ ] Resource quotas are sufficient

## Deployment Procedures

### Standard Deployment

#### 1. Environment Preparation

```bash
# Set environment variables
export ENVIRONMENT=production
export NAMESPACE=prp-system
export VERSION=0.5.0

# Verify cluster access
kubectl cluster-info
kubectl get nodes

# Create namespace
kubectl create namespace $NAMESPACE
```

#### 2. Configuration Setup

```bash
# Apply secrets
cat > prp-secrets.yaml << EOF
apiVersion: v1
kind: Secret
metadata:
  name: prp-secrets
  namespace: $NAMESPACE
type: Opaque
stringData:
  API_SECRET: "your-production-api-secret"
  REDIS_PASSWORD: "your-redis-password"
  JWT_SECRET: "your-jwt-secret"
EOF

kubectl apply -f prp-secrets.yaml
```

#### 3. Application Deployment

```bash
# Deploy using Kustomize
kubectl apply -k k8s/overlays/production/

# Verify deployment
kubectl get pods -n $NAMESPACE
kubectl get services -n $NAMESPACE
```

#### 4. Health Verification

```bash
# Wait for pods to be ready
kubectl wait --for=condition=available \
  --timeout=600s \
  deployment/prp-mcp-server -n $NAMESPACE

# Perform health check
kubectl port-forward -n $NAMESPACE svc/prp-mcp-server 8080:8080 &
PF_PID=$!

# Wait for port-forward
sleep 5

# Test application health
curl -f http://localhost:8080/health

# Clean up
kill $PF_PID 2>/dev/null
```

### Blue-Green Deployment

#### 1. Prepare New Environment

```bash
# Create green namespace
kubectl create namespace prp-green

# Deploy to green environment
export NAMESPACE=prp-green
kubectl apply -f k8s/base/namespace.yaml
kubectl apply -f k8s/base/configmap.yaml
kubectl apply -f k8s/base/rbac.yaml
```

#### 2. Deploy to Green

```bash
# Deploy application to green
kubectl apply -f k8s/base/deployment.yaml -n prp-green
kubectl apply -f k8s/base/service.yaml -n prp-green

# Wait for green deployment
kubectl wait --for=condition=available \
  deployment/prp-mcp-server -n prp-green \
  --timeout=600s
```

#### 3. Traffic Switching

```bash
# Update ingress to route traffic to green
cat > ingress-green.yaml << EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: prp-mcp-server-green
  namespace: prp-green
spec:
  rules:
    - host: prp.theedgestory.org
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: prp-mcp-server
                port:
                  number: 80
EOF

kubectl apply -f ingress-green.yaml
```

#### 4. Validation and Cleanup

```bash
# Test green deployment
curl -f http://prp.theedgestory.org/health

# Monitor for 5 minutes
for i in {1..30}; do
    if curl -f http://prp.theedgestory.org/health; then
        echo "✅ Green deployment verified"
        break
    fi
    sleep 10
done

# Clean up blue environment
kubectl delete namespace prp-blue --ignore-not-found=true
```

### Canary Deployment

#### 1. Canary Configuration

```bash
# Deploy 10% canary
cat > deployment-canary.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prp-mcp-server-canary
  namespace: prp-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: prp-cli
      app.kubernetes.io/component: mcp-server
      app.kubernetes.io/deployment: canary
  template:
    metadata:
      labels:
        app.kubernetes.io/name: prp-cli
        app.kubernetes.io/component: mcp-server
        app.kubernetes.io/deployment: canary
    spec:
      containers:
      - name: prp-mcp-server
        image: prp-cli:canary-$VERSION
        # ... other container configuration
EOF

kubectl apply -f deployment-canary.yaml
```

#### 2. Traffic Splitting

```bash
# Configure Istio or Nginx for traffic splitting
cat > virtual-service.yaml << EOF
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: prp-mcp-server
  namespace: prp-system
spec:
  hosts:
    - prp.theedgestory.org
  http:
  - match:
    - uri:
        prefix: "/"
      route:
      - destination:
          host: prp-mcp-server
          subset: stable
        weight: 90
      - destination:
          host: prp-mcp-server-canary
          subset: canary
        weight: 10
EOF

kubectl apply -f virtual-service.yaml
```

## Monitoring and Verification

### Deployment Health Checks

#### 1. Pod Status Verification

```bash
# Check pod readiness
kubectl get pods -n $NAMESPACE \
  -l app.kubernetes.io/name=prp-cli \
  -o custom-columns=POD_NAME:.metadata.name,READY:.status.containerStatuses[0].ready,RESTARTS:.status.restartCount

# Check deployment status
kubectl rollout status deployment/prp-mcp-server -n $NAMESPACE

# Check resource utilization
kubectl top pods -n $NAMESPACE
```

#### 2. Service Health Verification

```bash
# Check service endpoints
kubectl get endpoints -n $NAMESPACE

# Test application endpoints
ENDPOINT="http://prp.theedgestory.org"

# Health check
curl -f $ENDPOINT/health

# Metrics endpoint
curl -f $ENDPOINT/metrics

# Application functionality test
curl -f $ENDPOINT/api/test
```

#### 3. Performance Verification

```bash
# Load test the application
autocannon -c 10 -d 30 -p 5 $ENDPOINT/

# Monitor response times
curl -w "@{time_total}\n" -o /dev/null -s $ENDPOINT/health

# Check resource usage during load
kubectl top pods -n $NAMESPACE
```

### Monitoring Dashboard Verification

#### 1. Prometheus Metrics

```bash
# Access Prometheus dashboard
kubectl port-forward -n monitoring svc/prometheus 9090:9090 &
PF_PID=$!

# Check application metrics in browser
open http://localhost:9090/targets

# Verify custom metrics
curl -s "http://localhost:9090/api/v1/query?query=up{job=\"prp-mcp-server\"}"
```

#### 2. Grafana Dashboards

```bash
# Access Grafana
kubectl port-forward -n monitoring svc/grafana 3000:3000 &
GF_PID=$!

# Check dashboards
open http://localhost:3000/dashboards
```

## Troubleshooting Guide

### Common Deployment Issues

#### Pod Not Starting

**Symptoms**: Pods in Pending or CrashLoopBackOff state

**Diagnostic Steps**:

1. **Check Pod Events**
   ```bash
   kubectl describe pod -n $NAMESPACE <pod-name>
   ```

2. **Check Resource Constraints**
   ```bash
   kubectl top nodes
   kubectl describe node <node-name>
   ```

3. **Check Image Pull Issues**
   ```bash
   kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' | grep "ImagePull"
   ```

4. **Verify Secret Access**
   ```bash
   kubectl get secrets -n $NAMESPACE
   kubectl describe secret prp-secrets -n $NAMESPACE
   ```

**Resolution Steps**:

1. **Resource Issues**:
   ```bash
   # Check resource requests/limits
   kubectl describe deployment prp-mcp-server -n $NAMESPACE

   # Increase resources if needed
   kubectl patch deployment prp-mcp-server -n $NAMESPACE \
     -p '{"spec":{"template":{"spec":{"containers":[{"name":"prp-mcp-server","resources":{"requests":{"cpu":"200m","memory":"256Mi"}}}}}}}'
   ```

2. **Image Pull Issues**:
   ```bash
   # Verify image exists
   docker pull prp-cli:$VERSION

   # Check registry access
   docker login $REGISTRY
   ```

3. **Secret Issues**:
   ```bash
   # Recreate secrets
   kubectl delete secret prp-secrets -n $NAMESPACE
   kubectl apply -f prp-secrets.yaml -n $NAMESPACE
   ```

#### Service Connectivity Issues

**Symptoms**: Service unreachable, connection timeouts

**Diagnostic Steps**:

1. **Check Service Status**
   ```bash
   kubectl get svc -n $NAMESPACE
   kubectl describe service prp-mcp-server -n $NAMESPACE
   ```

2. **Check Endpoints**
   ```bash
   kubectl get endpoints -n $NAMESPACE prp-mcp-server
   ```

3. **Test Network Policies**
   ```bash
   kubectl get networkpolicies -n $NAMESPACE
   kubectl describe networkpolicy prp-network-policy -n $NAMESPACE
   ```

4. **Port Forwarding Test**
   ```bash
   kubectl port-forward -n $NAMESPACE svc/prp-mcp-server 8080:8080 &
   curl -f http://localhost:8080/health
   kill %1 2>/dev/null
   ```

**Resolution Steps**:

1. **Fix Service Configuration**:
   ```bash
   # Check port mappings
   kubectl get svc prp-mcp-server -n $NAMESPACE -o yaml
   ```

2. **Network Policy Issues**:
   ```bash
   # Add egress rules if needed
   kubectl patch networkpolicy prp-network-policy -n $NAMESPACE \
     -p '{"spec":{"egress":[{"to":[{"namespaceSelector":{"matchLabels":{"name":"prp-system"}}}},{"ports":[{"port":8080}]}]}}}'
   ```

#### Performance Issues

**Symptoms**: Slow response times, high resource utilization

**Diagnostic Steps**:

1. **Check Resource Usage**
   ```bash
   kubectl top pods -n $NAMESPACE
   kubectl top nodes
   ```

2. **Analyze Application Metrics**
   ```bash
   # Query Prometheus
   curl -G "http://prometheus:9090/api/v1/query?query=rate(http_request_duration_seconds_bucket[5m])"
   ```

3. **Check Database Performance**
   ```bash
   kubectl exec -it redis-pod -- redis-cli info
   kubectl exec -it redis-pod -- redis-cli latency doctor
   ```

**Resolution Steps**:

1. **Scale Application**
   ```bash
   kubectl scale deployment prp-mcp-server -n $NAMESPACE --replicas=5
   ```

2. **Optimize Resources**
   ```bash
   # Update resource limits
   kubectl patch deployment prp-mcp-server -n $NAMESPACE \
     -p '{"spec":{"template":{"spec":{"containers":[{"name":"prp-mcp-server","resources":{"limits":{"cpu":"500m","memory":"512Mi"}}}}}}}'
   ```

### Rollback Procedures

#### Emergency Rollback

**When to Use**:
- Deployment failure
- Service degradation
- Critical bugs detected

**Procedure**:

1. **Quick Rollback**
   ```bash
   # Rollback to previous revision
   kubectl rollout undo deployment/prp-mcp-server -n $NAMESPACE
   ```

2. **Verify Rollback**
   ```bash
   # Check rollout status
   kubectl rollout status deployment/prp-mcp-server -n $NAMESPACE

   # Wait for new pods
   kubectl wait --for=condition=available \
     deployment/prp-mcp-server -n $NAMESPACE --timeout=300s
   ```

3. **Test Functionality**
   ```bash
   curl -f http://prp.theedgestory.org/health
   ```

#### Full Restoration from Backup

**When to Use**:
- Complete system failure
- Data corruption
- Major infrastructure changes

**Procedure**:

1. **Stop Application**
   ```bash
   kubectl scale deployment prp-mcp-server -n $NAMESPACE --replicas=0
   ```

2. **Restore from Backup**
   ```bash
   # Run restore script
   ./disaster-recovery/scripts/restore-procedure.sh backup-file.tar.gz
   ```

3. **Verify Restoration**
   ```bash
   # Check all components
   kubectl get pods -n $NAMESPACE
   curl -f http://prp.theedgestory.org/health
   ```

## Maintenance Procedures

### Scheduled Maintenance

#### 1. Preparation

```bash
# Schedule maintenance window
echo "Scheduling maintenance for $(date +1 hour)"

# Create maintenance notice
cat > maintenance-notice.yaml << EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: maintenance-notice
  namespace: prp-system
data:
  message: "Scheduled maintenance in progress. Services may be temporarily unavailable."
  start_time: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  end_time: "$(date -u +1 hour +%Y-%m-%dT%H:%M:%SZ)"
EOF

kubectl apply -f maintenance-notice.yaml
```

#### 2. Application Updates

```bash
# Update application version
export NEW_VERSION="0.5.1"

# Update image tag
kubectl set image deployment/prp-mcp-server \
  prp-cli=prp-cli:$NEW_VERSION -n $NAMESPACE

# Rollout update
kubectl rollout restart deployment/prp-mcp-server -n $NAMESPACE

# Wait for rollout
kubectl rollout status deployment/prp-mcp-server -n $NAMESPACE --timeout=600s
```

#### 3. Verification

```bash
# Test updated application
curl -f http://prp.theedgestory.org/health

# Check version
curl -s http://prp.theedgestory.org/version

# Monitor metrics
kubectl top pods -n $NAMESPACE
```

### Backup Procedures

#### 1. Automated Backup

```bash
# Run daily backup
./disaster-recovery/scripts/backup-procedure.sh

# Verify backup completed
ls -la /var/backups/prp-cli/prp-backup-*.tar.gz
```

#### 2. Manual Backup

```bash
# Backup specific component
kubectl get deployment prp-mcp-server -n $NAMESPACE -o yaml > backup-deployment.yaml
kubectl get configmap -n $NAMESPACE -o yaml > backup-configmaps.yaml
kubectl get secrets -n $NAMESPACE -o yaml > backup-secrets.yaml
```

#### 3. Restore Testing

```bash
# Test restore process in staging environment
kubectl apply -f backup-deployment.yaml --dry-run=client
kubectl apply -f backup-configmaps.yaml --dry-run=client
kubectl apply -f backup-secrets.yaml --dry-run=client
```

## Emergency Procedures

### Service Outage Response

#### 1. Initial Assessment (0-5 minutes)

```bash
# Check current status
kubectl get pods -n $NAMESPACE
kubectl get events -n $namespace --sort-by='.lastTimestamp'

# Identify scope of impact
kubectl get nodes --field-selector=condition=Ready=False
kubectl get pods -n $NAMESPACE --field-selector=condition!=Ready
```

#### 2. Impact Analysis (5-15 minutes)

```bash
# Check affected services
kubectl get svc -n $NAMESPACE
kubectl get endpoints -n $NAMESPACE

# Check system resources
kubectl top nodes
kubectl top pods -n $NAMESPACE
```

#### 3. Immediate Response (15-30 minutes)

```bash
# Scale up healthy services
kubectl scale deployment prp-mcp-server -n $NAMESPACE --replicas=10

# Restart failing pods
kubectl delete pod -n $NAMESPACE <failing-pod>
kubectl rollout status deployment/prp-mcp-server -n $NAMESPACE
```

#### 4. Recovery Operations (30-120 minutes)

```bash
# Apply fixes based on root cause
# Example: Fix resource issues
kubectl patch deployment prp-mcp-server -n $NAMESPACE \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"prp-mcp-server","resources":{"requests":{"cpu":"500m","memory":"512Mi"}}}}}}}'
```

#### 5. Verification (120+ minutes)

```bash
# Verify service restoration
curl -f http://prp.theedgestory.org/health

# Monitor stability for 15 minutes
for i in {1..30}; do
    if curl -f http://prp.theedgestory.org/health; then
        echo "Service restored successfully"
        break
    fi
    sleep 30
done
```

### Security Incident Response

#### 1. Security Incident Identification

```bash
# Check for security alerts
kubectl get events -n $NAMESPACE --field-selector=type=Warning
kubectl logs -n $NAMESPACE | grep -i "security\|attack\|breach"
```

#### 2. Isolation

```bash
# Isolate affected pods
kubectl label pods -n $NAMESPACE security-incident=true

# Network isolation if needed
kubectl patch networkpolicy prp-network-policy -n $NAMESPACE \
  -p '{"spec":{"ingress":[{"from":[]}],"egress":[{"to":[]}]}}'
```

#### 3. Investigation and Analysis

```bash
# Collect forensic data
kubectl logs -n $NAMESPACE --since=1h > incident-logs.txt
kubectl describe pods -n $NAMESPACE > incident-pods.txt

# Check for suspicious activity
kubectl exec -it <pod-name> -- ps aux
kubectl exec -it <pod-name> -- netstat -an
```

#### 4. Remediation

```bash
# Remove malicious pods
kubectl delete pod -n $NAMESPACE <suspicious-pod>

# Apply security patches
kubectl apply -f security-patches.yaml

# Rotate credentials
kubectl delete secret prp-secrets -n $NAMESPACE
kubectl apply -f prp-secrets.yaml
```

#### 5. Recovery

```bash
# Restore normal operations
kubectl label pods -n $NAMESPACE security-incident-
kubectl patch networkpolicy prp-network-policy -n $NAMESPACE \
  -p '{"spec":{"ingress":[{"from":[{"namespaceSelector":{"matchLabels":{"name":"prp-system"}}}},{"ports":[{"port":8080}]}],"egress":[{"to":[{"namespaceSelector":{"matchLabels":{"name":"prp-system"}}},{"ports":[{"port":8080}]}]}}}'
```

## Post-Deployment Verification

### Comprehensive Checklist

#### Application Verification
- [ ] All pods are Running and Ready
- [ ] Service endpoints are accessible
- [ ] Health checks pass
- [ ] Metrics collection is working
- [ ] Application functionality verified
- [ ] Performance benchmarks met

#### Infrastructure Verification
- [ ] Resource utilization within limits
- [ ] Autoscaling rules working
- [ ] Security policies applied
- [ ] Backup procedures tested
- [ ] Monitoring dashboards updated

#### Security Verification
- [ ] No unauthorized access detected
- [ ] Security scans passed
- [ ] RBAC policies enforced
- [ ] Network policies effective
- [ ] Secrets are properly secured

### Documentation Updates

#### Post-Mortem Documentation

```bash
# Create incident report
cat > incident-report-$(date +%Y%m%d).md << EOF
# Incident Report - $(date +%Y-%m-%d)

## Summary
- **Incident Type**: Service Outage
- **Severity**: High
- **Duration**: X hours
- **Impact**: Y users affected

## Timeline
- **00:00**: Incident detected
- **00:05**: Initial assessment started
- **00:15**: Root cause identified
- **00:30**: Mitigation applied
- **01:30**: Service restored
- **02:00**: Normal operations resumed

## Root Cause
[Detailed root cause analysis]

## Impact
[Assessment of business impact]

## Resolution
[Steps taken to resolve]

## Prevention
[Measures to prevent recurrence]
EOF
```

## Runbook Maintenance

### Regular Updates

This runbook should be reviewed and updated:
- **Monthly**: Update procedures based on infrastructure changes
- **Quarterly**: Review and update troubleshooting steps
- **Annually**: Major version updates and rewrites

### Testing Procedures

Test all procedures in a non-production environment before updating the runbook:
- Verify commands execute correctly
- Test emergency procedures
- Validate troubleshooting steps
- Check documentation accuracy

### Feedback Process

Report any issues or suggestions for improvement:
1. Document the problem in detail
2. Suggest specific improvements
3. Test proposed changes
4. Update runbook accordingly

This runbook serves as the primary reference for all deployment operations and should be consulted for any deployment-related activities.