# {{PROJECT_NAME}}

{{PROJECT_DESCRIPTION}}

FastAPI application with automatic OpenAPI documentation, JWT authentication, and Docker deployment support.

## Features

- 🚀 FastAPI with automatic OpenAPI/Swagger documentation
- 🔐 JWT-based authentication system
- 📦 Docker and Docker Compose support
- 🧪 Unit testing with pytest
- 📊 Ready for production deployment
- 🔄 CORS support for frontend integration
- 📝 Comprehensive logging
- 🎯 Type hints with Pydantic models

## Quick Start

### Prerequisites

- Python 3.8+
- pip or poetry

### Installation

1. Clone the repository
2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Copy environment configuration:
```bash
cp .env.example .env
```

5. Run the application:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Using Docker

1. Build the image:
```bash
docker build -t {{PROJECT_NAME}} .
```

2. Run with Docker:
```bash
docker run -p 8000:8000 {{PROJECT_NAME}}
```

3. Or use Docker Compose:
```bash
docker-compose up -d
```

## API Documentation

Once the application is running, you can access:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## Project Structure

```
{{PROJECT_NAME}}/
├── app/
│   ├── __init__.py          # Package initialization
│   ├── main.py              # FastAPI application entry point
│   └── routers/
│       ├── __init__.py
│       ├── items.py         # Items CRUD operations
│       └── users.py         # User management and auth
├── tests/                   # Test files (create as needed)
├── requirements.txt         # Python dependencies
├── .env.example            # Environment variables template
├── Dockerfile              # Docker configuration
├── docker-compose.yml      # Docker Compose configuration
└── README.md               # This file
```

## API Endpoints

### Health Check
- `GET /health` - Check API status

### Authentication
- `POST /api/v1/users/register` - Register new user
- `POST /api/v1/users/login` - Login and get token
- `GET /api/v1/users/me` - Get current user info

### Items
- `GET /api/v1/items/` - List all items
- `POST /api/v1/items/` - Create new item
- `GET /api/v1/items/{id}` - Get item by ID
- `PUT /api/v1/items/{id}` - Update item
- `DELETE /api/v1/items/{id}` - Delete item
- `GET /api/v1/items/search/{query}` - Search items

### Users (Admin)
- `GET /api/v1/users/` - List all users
- `GET /api/v1/users/{id}` - Get user by ID
- `PUT /api/v1/users/{id}` - Update user
- `DELETE /api/v1/users/{id}` - Delete user

## Development

### Running Tests

```bash
pytest
```

### Code Formatting

```bash
black app/
isort app/
```

### Type Checking

```bash
mypy app/
```

### Linting

```bash
flake8 app/
```

## Configuration

The application can be configured through environment variables. See `.env.example` for all available options.

## Deployment

### Production with Docker

1. Set environment variables
2. Build the production image:
```bash
docker build -t {{PROJECT_NAME}}:latest .
```

3. Run with production settings:
```bash
docker run -d \
  --name {{PROJECT_NAME}} \
  -p 8000:8000 \
  -e DEBUG=false \
  -e SECRET_KEY=your-production-secret \
  {{PROJECT_NAME}}:latest
```

### Using Docker Compose

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the repository or contact {{EMAIL}}.