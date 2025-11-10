# How to Contribute

**Join the community and help shape the future of autonomous development**

---

## 📋 Previous: [PRP Orchestrator →](./prp-orchestrator.md)

---

## Overview

PRP is an open-source project that thrives on community contributions. Whether you're fixing bugs, adding features, improving documentation, or sharing feedback, your contribution is valuable.

## Ways to Contribute

### 1. Code Contributions
- Fix bugs and issues
- Implement new features
- Improve performance
- Add tests

### 2. Documentation
- Improve guides and tutorials
- Translate documentation
- Add examples
- Fix typos and errors

### 3. Community
- Answer questions in discussions
- Help triage issues
- Share success stories
- Provide feedback

### 4. Design
- Improve UI/UX
- Create diagrams
- Design assets
- Accessibility improvements

## Getting Started

### Development Setup

1. **Fork and Clone**
```bash
git clone https://github.com/your-username/prp.git
cd prp
```

2. **Install Dependencies**
```bash
npm install
```

3. **Set Up Development Environment**
```bash
npm run dev
```

4. **Run Tests**
```bash
npm test
```

### Making Changes

1. **Create Branch**
```bash
git checkout -b feature/your-feature-name
```

2. **Make Changes**
- Follow the coding standards
- Add tests for new functionality
- Update documentation

3. **Commit Changes**
```bash
git commit -m "feat: add new feature description"
```

4. **Push and Create PR**
```bash
git push origin feature/your-feature-name
# Create pull request on GitHub
```

## Contribution Guidelines

### Code Style
- Use TypeScript strict mode
- Follow ESLint configuration
- Write meaningful commit messages
- Include tests for all changes

### PRP Format
When adding features, create PRPs following the format:
```markdown
# PRP-XXX: Feature Title

> User requirements quote

## progress
[aa] Working on implementation - admin-1

## description
Clear description of what needs to be done

## dor
- [ ] Checklist items

## dod
- [ ] Measurable outcomes
- [ ] Test coverage
- [ ] Documentation updated
```

### Testing
- Unit tests for all functions
- Integration tests for workflows
- E2E tests for critical paths
- Performance tests for bottlenecks

### Documentation
- Update README.md if needed
- Add JSDoc comments
- Create/update guides
- Include examples

## Development Workflow

### 1. Triage Issues
- Look for issues labeled "good first issue"
- Comment on issues you want to work on
- Wait for assignment

### 2. Development
- Create feature branch from main
- Implement changes incrementally
- Run tests frequently
- Update documentation

### 3. Review Process
- Submit pull request
- Address review feedback
- Ensure CI passes
- Merge after approval

## Areas of Focus

### High Priority
1. **Test Coverage** - Increase from 0.12% to 80%+
2. **CLI Stability** - Fix command-line issues
3. **Performance** - Improve startup time and memory usage
4. **Documentation** - Complete user guides

### Medium Priority
1. **Agent Coordination** - Improve parallel execution
2. **Signal System** - Enhance signal taxonomy
3. **TUI Improvements** - Better user experience
4. **Template System** - More project templates

### Low Priority
1. **Plugins** - Extensibility framework
2. **Analytics** - Usage tracking
3. **Internationalization** - Multi-language support
4. **Mobile Support** - Mobile TUI

## Community Resources

### GitHub
- [Issues](https://github.com/dcversus/prp/issues) - Bug reports and feature requests
- [Discussions](https://github.com/dcversus/prp/discussions) - General discussion
- [Pull Requests](https://github.com/dcversus/prp/pulls) - Code review

### Communication
- Discord: [PRP Community](https://discord.gg/prp)
- Twitter: [@dcversus](https://twitter.com/dcversus)
- Email: prp@dcversus.com

## Recognition

Contributors are recognized in multiple ways:

### Hall of Fame
- Top contributors in README.md
- Monthly contributor spotlight
- Annual awards

### Swag
- Contributor t-shirts
- Stickers and badges
- Special Discord roles

## Code of Conduct

### Our Pledge
- Be inclusive and respectful
- Focus on what is best for the community
- Show empathy towards other community members

### Standards
- Use welcoming and inclusive language
- Respect different viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community

## Getting Help

### Resources
- [Documentation](./readme.md)
- [FAQ](https://github.com/dcversus/prp/discussions/categories/q-a)
- [Examples](https://github.com/dcversus/prp/tree/main/examples)

### Support
- Create an issue for bugs
- Use discussions for questions
- Join Discord for real-time help

---

Thank you for contributing to PRP! Every contribution, no matter how small, helps make autonomous development better for everyone.

**Previous**: [PRP Orchestrator →](./prp-orchestrator.md)