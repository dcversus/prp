# {{PROJECT_NAME}} Wiki

{{DESCRIPTION}}

Powered by Wiki.js with PostgreSQL backend.

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 16+ (for npm scripts)

### Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd {{PROJECT_NAME_KEBAB}}
```

2. Start the services:
```bash
npm start
```

3. Wait for the services to be ready (usually 1-2 minutes):
```bash
npm logs
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

## 📋 Available Scripts

```bash
# Start all services
npm start

# Stop all services
npm stop

# Restart services
npm restart

# View logs
npm logs

# Check service status
npm ps

# Create database backup
npm backup

# Restore database from backup
npm restore <backup-file.sql>

# Clean up everything (removes volumes!)
npm clean

# Update to latest Wiki.js version
npm update

# Access database shell
npm shell-db

# Access Wiki.js container shell
npm shell-wiki
```

## 🗄️ Database

This setup uses PostgreSQL as the database backend:

- **Host**: localhost:5432
- **Database**: wiki
- **Username**: wikijs
- **Password**: wikijsrocks

### Database Management

```bash
# Create a backup
npm backup

# Connect to database
npm shell-db

# View tables
\dt

# Exit database
\q
```

## 📁 Directory Structure

```
{{PROJECT_NAME_KEBAB}}/
├── config.yml          # Wiki.js configuration
├── docker-compose.yml  # Docker Compose setup
├── package.json        # Node.js package configuration
├── README.md          # This file
└── data/              # Wiki.js data directory (created automatically)
```

## ⚙️ Configuration

The main configuration is in `config.yml`. Key settings:

- **Server**: Runs on port 3000
- **Database**: PostgreSQL connection
- **Authentication**: Local authentication enabled
- **Features**: Rich editing, comments, ratings, and more

## 🔧 Maintenance

### Backups

Regular backups are recommended:

```bash
# Create automatic backup
npm backup

# Schedule daily backups (add to crontab)
0 2 * * * cd /path/to/{{PROJECT_NAME_KEBAB}} && npm backup
```

### Updates

```bash
# Update to latest version
npm update

# Check current version
docker-compose exec wiki wiki --version
```

### Troubleshooting

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs wiki
docker-compose logs db

# Restart services
npm restart

# Full reset (removes all data!)
npm clean
```

## 🔐 Security

- Change default passwords in production
- Use HTTPS in production environments
- Regular backups are essential
- Consider using environment variables for sensitive data

## 📚 Wiki.js Documentation

For detailed Wiki.js documentation, visit:
- [Official Wiki.js Documentation](https://docs.requarks.io/)
- [GitHub Repository](https://github.com/Requarks/wiki)

## 👥 Contributing

1. Make your changes to the configuration
2. Test in a development environment
3. Update this README if needed
4. Commit your changes

## 📞 Support

For issues specific to this setup, please create an issue in the repository.

For Wiki.js specific issues, please refer to the official Wiki.js documentation.

## 📄 License

This project is private and confidential.

---

**Author**: {{AUTHOR}}
**Created**: {{CURRENT_DATE}}
**Version**: 1.0.0