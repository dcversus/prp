# {{PROJECT_NAME}}

{{DESCRIPTION}}

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start:dev

# production mode
$ npm run start:prod
```

## API Documentation

Once the application is running, you can access the API documentation at:
- Swagger UI: `http://localhost:3000/api`

## API Endpoints

### Health Check
- `GET /health` - Health status of the application
- `GET /info` - Application information

### Default
- `GET /` - Returns a greeting message

## Environment Variables

```bash
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000
```

## Testing

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Development

### Code Style

This project uses ESLint and Prettier for code formatting.

```bash
# lint and fix code
$ npm run lint

# format code
$ npm run format
```

### Building

```bash
# build the application
$ npm run build
```

## Author

**{{AUTHOR}}**

## License

This project is private and confidential.