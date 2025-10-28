/**
 * FastAPI template generator
 * Based on dcmaidbot patterns
 */

import { GeneratorContext, FileToGenerate, TemplateData } from '../types.js';

export async function generateFastAPI(context: GeneratorContext): Promise<FileToGenerate[]> {
  const { options } = context;
  const files: FileToGenerate[] = [];

  const data: TemplateData = {
    projectName: options.name,
    description: options.description,
    author: options.author,
    email: options.email,
    telegram: options.telegram,
    license: options.license,
    year: new Date().getFullYear(),
    template: options.template,
    hasCodeOfConduct: options.includeCodeOfConduct,
    hasContributing: options.includeContributing,
    hasCLA: options.includeCLA,
    hasSecurityPolicy: options.includeSecurityPolicy,
    hasIssueTemplates: options.includeIssueTemplates,
    hasPRTemplate: options.includePRTemplate,
    hasGitHubActions: options.includeGitHubActions,
    hasEditorConfig: options.includeEditorConfig,
    hasESLint: options.includeESLint,
    hasPrettier: options.includePrettier,
    hasDocker: options.includeDocker,
  };

  // Python requirements
  files.push({
    path: 'requirements.txt',
    content: generateRequirements(),
  });

  // Main application files
  files.push({
    path: 'main.py',
    content: generateMainPy(data),
  });

  // Application structure (similar to dcmaidbot)
  files.push({
    path: 'app/__init__.py',
    content: '',
  });

  files.push({
    path: 'app/models.py',
    content: generateModels(),
  });

  files.push({
    path: 'app/schemas.py',
    content: generateSchemas(),
  });

  files.push({
    path: 'app/routers/__init__.py',
    content: '',
  });

  files.push({
    path: 'app/routers/health.py',
    content: generateHealthRouter(),
  });

  files.push({
    path: 'app/services/__init__.py',
    content: '',
  });

  // Configuration
  files.push({
    path: '.env.example',
    content: generateEnvExample(data),
  });

  // Tests
  files.push({
    path: 'tests/__init__.py',
    content: '',
  });

  files.push({
    path: 'tests/test_main.py',
    content: generateTestMain(data),
  });

  files.push({
    path: 'tests/conftest.py',
    content: generateConftest(),
  });

  // Python tooling configs
  files.push({
    path: 'pyproject.toml',
    content: generatePyprojectToml(data),
  });

  files.push({
    path: 'ruff.toml',
    content: generateRuffConfig(),
  });

  return files;
}

function generateRequirements(): string {
  return `fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.0
pydantic-settings==2.1.0
python-dotenv==1.0.0
httpx==0.26.0

# Testing
pytest==7.4.0
pytest-asyncio==0.21.0
pytest-cov==4.1.0

# Code quality
ruff==0.1.0
mypy==1.7.0
`;
}

function generateMainPy(data: TemplateData): string {
  return `"""
${data.projectName}
${data.description}

Author: ${data.author} <${data.email}>
License: ${data.license}
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import health

app = FastAPI(
    title="${data.projectName}",
    description="${data.description}",
    version="0.1.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api", tags=["health"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "${data.projectName}",
        "version": "0.1.0",
        "description": "${data.description}",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
`;
}

function generateModels(): string {
  return `"""
Database models
"""

from pydantic import BaseModel


class ExampleModel(BaseModel):
    """Example model"""

    id: str
    name: str
    description: str | None = None
`;
}

function generateSchemas(): string {
  return `"""
API schemas (request/response models)
"""

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Health check response"""

    status: str = Field(..., description="Service status")
    version: str = Field(..., description="API version")


class ExampleRequest(BaseModel):
    """Example request schema"""

    name: str = Field(..., min_length=1, description="Name field")
    description: str | None = Field(None, description="Optional description")


class ExampleResponse(BaseModel):
    """Example response schema"""

    id: str = Field(..., description="Unique identifier")
    name: str = Field(..., description="Name field")
    description: str | None = Field(None, description="Description field")
`;
}

function generateHealthRouter(): string {
  return `"""
Health check router
"""

from fastapi import APIRouter

from app.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        version="0.1.0",
    )
`;
}

function generateEnvExample(data: TemplateData): string {
  return `# ${data.projectName} Configuration

# Application
APP_NAME=${data.projectName}
APP_VERSION=0.1.0
DEBUG=true

# Server
HOST=0.0.0.0
PORT=8000

# Database (if needed)
# DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# API Keys (if needed)
# API_KEY=your-secret-key
`;
}

function generateTestMain(data: TemplateData): string {
  return `"""
Tests for main application
"""

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_root():
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "${data.projectName}"
    assert "version" in data


def test_health_check():
    """Test health check endpoint"""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == "0.1.0"
`;
}

function generateConftest(): string {
  return `"""
Pytest configuration
"""

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    """FastAPI test client"""
    return TestClient(app)
`;
}

function generatePyprojectToml(data: TemplateData): string {
  return `[project]
name = "${data.projectName}"
version = "0.1.0"
description = "${data.description}"
authors = [
    { name = "${data.author}", email = "${data.email}" }
]
license = { text = "${data.license}" }
requires-python = ">=3.11"

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = "test_*.py"
python_classes = "Test*"
python_functions = "test_*"
asyncio_mode = "auto"
addopts = [
    "--strict-markers",
    "--cov=app",
    "--cov-report=term-missing",
    "--cov-report=html",
]

[tool.mypy]
python_version = "3.11"
strict = true
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true

[tool.coverage.run]
source = ["app"]
omit = ["tests/*"]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise AssertionError",
    "raise NotImplementedError",
    "if __name__ == .__main__.:",
]
`;
}

function generateRuffConfig(): string {
  return `# Ruff configuration
target-version = "py311"
line-length = 100

[lint]
select = [
    "E",   # pycodestyle errors
    "W",   # pycodestyle warnings
    "F",   # pyflakes
    "I",   # isort
    "C",   # flake8-comprehensions
    "B",   # flake8-bugbear
    "UP",  # pyupgrade
]
ignore = [
    "E501",  # line too long (handled by formatter)
]

[lint.per-file-ignores]
"__init__.py" = ["F401"]

[format]
quote-style = "double"
indent-style = "space"
`;
}
