#!/usr/bin/env node

/**
 * Development Workflow Helper Script
 *
 * Provides convenient commands for RepCue development workflow including
 * version management, release preparation, and deployment automation.
 *
 * Usage:
 *   node scripts/dev-workflow.mjs release [type] [options]
 *   node scripts/dev-workflow.mjs hotfix <version> [options]
 *   node scripts/dev-workflow.mjs prepare-release
 *   node scripts/dev-workflow.mjs bump [type]
 *   node scripts/dev-workflow.mjs status
 *
 * Examples:
 *   node scripts/dev-workflow.mjs release patch --changelog "Bug fixes"
 *   node scripts/dev-workflow.mjs hotfix 1.2.1 --policy critical
 *   node scripts/dev-workflow.mjs prepare-release
 *   node scripts/dev-workflow.mjs bump minor
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { GitUtils, VersionValidator, BuildMetadata, VersionManager } from './version-management.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../..');

// Color utilities
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg) => console.log(`${colors.bright}${colors.cyan}${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.magenta}→${colors.reset} ${msg}`)
};

/**
 * Release management utilities
 */
class ReleaseManager {
  /**
   * Get current version from package.json
   */
  static getCurrentVersion() {
    try {
      const packagePath = join(projectRoot, 'apps/frontend/package.json');
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      return packageJson.version;
    } catch (error) {
      log.error('Could not read current version from package.json');
      return '0.0.0';
    }
  }

  /**
   * Update package.json version
   */
  static updatePackageVersion(newVersion) {
    try {
      const packagePath = join(projectRoot, 'apps/frontend/package.json');
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
      packageJson.version = newVersion;
      writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
      log.success(`Updated package.json version to ${newVersion}`);
      return true;
    } catch (error) {
      log.error(`Failed to update package.json: ${error.message}`);
      return false;
    }
  }

  /**
   * Calculate next version based on current version and bump type
   */
  static calculateNextVersion(currentVersion, bumpType) {
    const validation = VersionValidator.validateSemVer(currentVersion);
    if (!validation.valid) {
      throw new Error(`Current version ${currentVersion} is invalid: ${validation.error}`);
    }

    const { major, minor, patch, prerelease } = validation;

    switch (bumpType) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
        return `${major}.${minor}.${patch + 1}`;
      case 'prerelease':
        if (prerelease) {
          // Increment existing prerelease
          const parts = prerelease.split('.');
          const lastPart = parts[parts.length - 1];
          if (/^\d+$/.test(lastPart)) {
            parts[parts.length - 1] = String(parseInt(lastPart, 10) + 1);
            return `${major}.${minor}.${patch}-${parts.join('.')}`;
          } else {
            return `${major}.${minor}.${patch}-${prerelease}.1`;
          }
        } else {
          // Add prerelease to stable version
          return `${major}.${minor}.${patch + 1}-alpha.1`;
        }
      default:
        throw new Error(`Invalid bump type: ${bumpType}. Must be major, minor, patch, or prerelease`);
    }
  }

  /**
   * Create a standard release
   */
  static async createRelease(bumpType = 'patch', options = {}) {
    log.header(`Creating ${bumpType} release`);

    // Pre-flight checks
    this.performPreflightChecks(options.force);

    // Calculate next version
    const currentVersion = this.getCurrentVersion();
    const nextVersion = this.calculateNextVersion(currentVersion, bumpType);

    log.info(`Current version: ${currentVersion}`);
    log.info(`Next version: ${nextVersion}`);

    // Update package.json
    log.step('Updating package.json version');
    if (!this.updatePackageVersion(nextVersion)) {
      process.exit(1);
    }

    // Run tests
    if (!options.skipTests) {
      log.step('Running tests');
      this.runTests();
    }

    // Build application
    if (!options.skipBuild) {
      log.step('Building application');
      this.buildApplication();
    }

    // Create version entry
    log.step('Creating version entry');
    const versionOptions = {
      policy: options.policy || (bumpType === 'major' ? 'critical' : 'optional'),
      changelog: options.changelog || this.generateAutomaticChangelog(currentVersion, nextVersion),
      tag: true,
      sql: true,
      ...options
    };

    await VersionManager.createVersionEntry(nextVersion, versionOptions);

    // Commit changes
    if (!options.dryRun) {
      log.step('Committing changes');
      this.commitRelease(nextVersion, bumpType);
    }

    log.success(`Release ${nextVersion} created successfully! 🎉`);
    this.showNextSteps(nextVersion, bumpType);

    return nextVersion;
  }

  /**
   * Create a hotfix release
   */
  static async createHotfix(version, options = {}) {
    log.header(`Creating hotfix release: ${version}`);

    // Validate hotfix version
    const validation = VersionValidator.validateSemVer(version);
    if (!validation.valid) {
      log.error(`Invalid hotfix version: ${validation.error}`);
      process.exit(1);
    }

    // Pre-flight checks
    this.performPreflightChecks(options.force);

    // Update package.json
    log.step('Updating package.json version');
    if (!this.updatePackageVersion(version)) {
      process.exit(1);
    }

    // Run critical tests only
    log.step('Running critical tests');
    this.runCriticalTests();

    // Build application
    log.step('Building application');
    this.buildApplication();

    // Create version entry with hotfix defaults
    log.step('Creating hotfix version entry');
    const versionOptions = {
      policy: options.policy || 'critical',
      changelog: options.changelog || `Hotfix ${version}`,
      tag: true,
      sql: true,
      deploy: true,
      ...options
    };

    await VersionManager.createVersionEntry(version, versionOptions);

    // Commit hotfix
    if (!options.dryRun) {
      log.step('Committing hotfix');
      this.commitHotfix(version);
    }

    log.success(`Hotfix ${version} created successfully! 🚑`);
    this.showHotfixSteps(version);

    return version;
  }

  /**
   * Perform pre-flight checks before release
   */
  static performPreflightChecks(force = false) {
    log.step('Performing pre-flight checks');

    // Check git status
    if (!GitUtils.isWorkingDirectoryClean() && !force) {
      log.error('Working directory is not clean. Commit or stash changes first.');
      log.info('Modified files:');
      GitUtils.getModifiedFiles().forEach(file => {
        log.info(`  - ${file}`);
      });
      log.info('Use --force to bypass this check');
      process.exit(1);
    }

    // Check current branch
    const currentBranch = GitUtils.getBranch();
    if (currentBranch !== 'main' && currentBranch !== 'master' && !force) {
      log.warning(`Currently on branch '${currentBranch}', not 'main' or 'master'`);
      log.info('Use --force to release from current branch');
      if (!force) process.exit(1);
    }

    // Check Node.js version
    const nodeVersion = process.version;
    const requiredMajor = 18;
    const currentMajor = parseInt(nodeVersion.slice(1).split('.')[0], 10);

    if (currentMajor < requiredMajor) {
      log.warning(`Node.js ${nodeVersion} is older than recommended v${requiredMajor}+`);
    }

    log.success('Pre-flight checks passed');
  }

  /**
   * Run test suite
   */
  static runTests() {
    try {
      execSync('pnpm test:ci', {
        cwd: join(projectRoot, 'apps/frontend'),
        stdio: 'inherit'
      });
      log.success('All tests passed');
    } catch (error) {
      log.error('Tests failed');
      process.exit(1);
    }
  }

  /**
   * Run critical tests only (for hotfixes)
   */
  static runCriticalTests() {
    try {
      // Run only unit tests and critical e2e tests
      execSync('pnpm test:unit', {
        cwd: join(projectRoot, 'apps/frontend'),
        stdio: 'inherit'
      });
      log.success('Critical tests passed');
    } catch (error) {
      log.error('Critical tests failed');
      process.exit(1);
    }
  }

  /**
   * Build application
   */
  static buildApplication() {
    try {
      execSync('pnpm build:prod', {
        cwd: join(projectRoot, 'apps/frontend'),
        stdio: 'inherit'
      });
      log.success('Application built successfully');
    } catch (error) {
      log.error('Build failed');
      process.exit(1);
    }
  }

  /**
   * Generate automatic changelog from git commits
   */
  static generateAutomaticChangelog(fromVersion, toVersion) {
    try {
      // Get commits since last version tag
      const commits = execSync(`git log v${fromVersion}..HEAD --oneline --no-merges`, {
        cwd: projectRoot,
        encoding: 'utf8'
      }).trim().split('\n').filter(Boolean);

      if (commits.length === 0) {
        return `Release ${toVersion}`;
      }

      // Categorize commits
      const features = [];
      const fixes = [];
      const improvements = [];
      const other = [];

      commits.forEach(commit => {
        const message = commit.toLowerCase();
        if (message.includes('feat:') || message.includes('feature:')) {
          features.push(commit.substring(8)); // Remove commit hash
        } else if (message.includes('fix:') || message.includes('bug:')) {
          fixes.push(commit.substring(8));
        } else if (message.includes('improve:') || message.includes('enhancement:')) {
          improvements.push(commit.substring(8));
        } else {
          other.push(commit.substring(8));
        }
      });

      // Create structured changelog
      const changelog = {};

      if (features.length > 0) {
        changelog.new_features = features;
      }

      if (improvements.length > 0) {
        changelog.improvements = improvements;
      }

      if (fixes.length > 0) {
        changelog.bug_fixes = fixes;
      }

      return Object.keys(changelog).length > 0 ? changelog : `Release ${toVersion}`;

    } catch (error) {
      log.warning('Could not generate automatic changelog');
      return `Release ${toVersion}`;
    }
  }

  /**
   * Commit release changes
   */
  static commitRelease(version, bumpType) {
    try {
      // Add all changes
      execSync('git add .', { cwd: projectRoot });

      // Create commit
      const commitMessage = `release: ${version} (${bumpType})

- Update version to ${version}
- Generate version entry and migration
- Update build metadata

🤖 Generated with RepCue dev-workflow script
`;

      execSync(`git commit -m "${commitMessage}"`, { cwd: projectRoot });
      log.success(`Release commit created`);

    } catch (error) {
      log.error(`Failed to commit release: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Commit hotfix changes
   */
  static commitHotfix(version) {
    try {
      // Add all changes
      execSync('git add .', { cwd: projectRoot });

      // Create commit
      const commitMessage = `hotfix: ${version}

Critical hotfix release

🚑 Hotfix generated with RepCue dev-workflow script
`;

      execSync(`git commit -m "${commitMessage}"`, { cwd: projectRoot });
      log.success(`Hotfix commit created`);

    } catch (error) {
      log.error(`Failed to commit hotfix: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Show next steps after release
   */
  static showNextSteps(version, bumpType) {
    log.header('Next Steps');
    console.log(`
${colors.bright}1. Review the release:${colors.reset}
   git show HEAD
   cat version-entry-${version}.json

${colors.bright}2. Push to remote:${colors.reset}
   git push origin main
   git push origin v${version}

${colors.bright}3. Deploy to production:${colors.reset}
   ./deploy-${version}.sh
   # or manually apply the migration:
   supabase db push

${colors.bright}4. Monitor deployment:${colors.reset}
   - Check update rollout in Supabase dashboard
   - Monitor error rates and user feedback
   - Verify update notifications work correctly

${colors.bright}5. Post-release:${colors.reset}
   - Update CHANGELOG.md if needed
   - Notify team of release
   - Close related issues/PRs
`);
  }

  /**
   * Show hotfix steps
   */
  static showHotfixSteps(version) {
    log.header('Hotfix Deployment Steps');
    console.log(`
${colors.red}${colors.bright}CRITICAL HOTFIX: ${version}${colors.reset}

${colors.bright}1. Immediate deployment:${colors.reset}
   ./deploy-${version}.sh

${colors.bright}2. Monitor rollout:${colors.reset}
   - Watch Supabase logs for errors
   - Monitor user update success rates
   - Check for any rollback needs

${colors.bright}3. Communication:${colors.reset}
   - Notify team immediately
   - Prepare user communication if needed
   - Document the incident

${colors.bright}4. Follow-up:${colors.reset}
   - Merge hotfix back to main branch
   - Update documentation
   - Review incident and improve processes
`);
  }

  /**
   * Prepare release by running checks and showing current status
   */
  static prepareRelease() {
    log.header('Release Preparation Report');

    const currentVersion = this.getCurrentVersion();
    const buildInfo = BuildMetadata.getBuildInfo();

    console.log(`${colors.bright}Current State:${colors.reset}`);
    console.log(`  Version: ${currentVersion}`);
    console.log(`  Branch: ${buildInfo.git.branch}`);
    console.log(`  Commit: ${buildInfo.git.commit_hash_short}`);
    console.log(`  Clean: ${buildInfo.git.is_clean ? '✅' : '❌'}`);

    // Check for possible version bumps
    console.log(`\n${colors.bright}Possible Releases:${colors.reset}`);
    try {
      console.log(`  Patch: ${this.calculateNextVersion(currentVersion, 'patch')}`);
      console.log(`  Minor: ${this.calculateNextVersion(currentVersion, 'minor')}`);
      console.log(`  Major: ${this.calculateNextVersion(currentVersion, 'major')}`);
    } catch (error) {
      log.error(`Cannot calculate next versions: ${error.message}`);
    }

    // Check recent commits
    try {
      const recentCommits = execSync('git log --oneline -10', {
        cwd: projectRoot,
        encoding: 'utf8'
      }).trim().split('\n');

      console.log(`\n${colors.bright}Recent Commits:${colors.reset}`);
      recentCommits.forEach(commit => {
        console.log(`  ${commit}`);
      });
    } catch (error) {
      log.warning('Could not get recent commits');
    }

    // Check if there are any version entries pending
    try {
      const pendingVersions = execSync('find . -name "version-entry-*.json" -type f', {
        cwd: projectRoot,
        encoding: 'utf8'
      }).trim().split('\n').filter(Boolean);

      if (pendingVersions.length > 0) {
        console.log(`\n${colors.bright}Pending Version Entries:${colors.reset}`);
        pendingVersions.forEach(file => {
          console.log(`  ${file}`);
        });
      }
    } catch (error) {
      // No pending versions or find command failed
    }

    console.log(`\n${colors.bright}Release Commands:${colors.reset}`);
    console.log(`  node scripts/dev-workflow.mjs release patch`);
    console.log(`  node scripts/dev-workflow.mjs release minor`);
    console.log(`  node scripts/dev-workflow.mjs release major`);
    console.log(`  node scripts/dev-workflow.mjs hotfix <version>`);
  }

  /**
   * Show development status
   */
  static showStatus() {
    log.header('Development Status');

    const buildInfo = BuildMetadata.getBuildInfo();
    const currentVersion = this.getCurrentVersion();

    // Git status
    console.log(`${colors.bright}Git Status:${colors.reset}`);
    console.log(`  Branch: ${buildInfo.git.branch}`);
    console.log(`  Commit: ${buildInfo.git.commit_hash_short}`);
    console.log(`  Author: ${buildInfo.git.author.name}`);
    console.log(`  Clean: ${buildInfo.git.is_clean ? '✅' : '❌'}`);

    if (!buildInfo.git.is_clean) {
      console.log(`  Modified files:`);
      buildInfo.git.modified_files.forEach(file => {
        console.log(`    - ${file}`);
      });
    }

    // Version info
    console.log(`\n${colors.bright}Version Info:${colors.reset}`);
    console.log(`  Current: ${currentVersion}`);
    console.log(`  Tag: ${buildInfo.git.tag || 'none'}`);

    // Build info
    console.log(`\n${colors.bright}Environment:${colors.reset}`);
    console.log(`  Node: ${buildInfo.build.node_version}`);
    console.log(`  Platform: ${buildInfo.build.platform}`);
    console.log(`  CI: ${buildInfo.build.ci ? '✅' : '❌'}`);

    // Quick actions
    console.log(`\n${colors.bright}Quick Actions:${colors.reset}`);
    console.log(`  node scripts/dev-workflow.mjs prepare-release`);
    console.log(`  node scripts/dev-workflow.mjs bump patch`);
    console.log(`  node scripts/version-management.mjs build-info`);
  }
}

/**
 * CLI interface
 */
class WorkflowCLI {
  static run() {
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
      case 'release':
        this.handleRelease(args.slice(1));
        break;

      case 'hotfix':
        this.handleHotfix(args.slice(1));
        break;

      case 'prepare-release':
        ReleaseManager.prepareRelease();
        break;

      case 'bump':
        this.handleBump(args.slice(1));
        break;

      case 'status':
        ReleaseManager.showStatus();
        break;

      case 'help':
      case '--help':
      case '-h':
        this.showHelp();
        break;

      default:
        log.error(`Unknown command: ${command}`);
        this.showHelp();
        process.exit(1);
    }
  }

  static handleRelease(args) {
    const bumpType = args[0] || 'patch';
    const options = this.parseOptions(args.slice(1));
    ReleaseManager.createRelease(bumpType, options);
  }

  static handleHotfix(args) {
    const version = args[0];

    if (!version) {
      log.error('Hotfix version is required');
      log.info('Usage: node scripts/dev-workflow.mjs hotfix <version> [options]');
      process.exit(1);
    }

    const options = this.parseOptions(args.slice(1));
    ReleaseManager.createHotfix(version, options);
  }

  static handleBump(args) {
    const bumpType = args[0] || 'patch';
    const currentVersion = ReleaseManager.getCurrentVersion();

    try {
      const nextVersion = ReleaseManager.calculateNextVersion(currentVersion, bumpType);
      log.info(`Current version: ${currentVersion}`);
      log.info(`Next ${bumpType} version: ${nextVersion}`);

      if (ReleaseManager.updatePackageVersion(nextVersion)) {
        log.success(`Version bumped to ${nextVersion}`);
      }
    } catch (error) {
      log.error(`Failed to bump version: ${error.message}`);
      process.exit(1);
    }
  }

  static parseOptions(args) {
    const options = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      switch (arg) {
        case '--policy':
          options.policy = args[++i];
          break;
        case '--changelog':
          options.changelog = args[++i];
          break;
        case '--force':
          options.force = true;
          break;
        case '--skip-tests':
          options.skipTests = true;
          break;
        case '--skip-build':
          options.skipBuild = true;
          break;
        case '--dry-run':
          options.dryRun = true;
          break;
        default:
          log.warning(`Unknown option: ${arg}`);
      }
    }

    return options;
  }

  static showHelp() {
    console.log(`
${colors.bright}${colors.cyan}RepCue Development Workflow Helper${colors.reset}

${colors.bright}USAGE:${colors.reset}
  node scripts/dev-workflow.mjs <command> [options]

${colors.bright}COMMANDS:${colors.reset}
  release [type]         Create a new release (patch|minor|major, default: patch)
  hotfix <version>       Create a critical hotfix release
  prepare-release        Show current status and prepare for release
  bump [type]           Bump version in package.json only
  status                Show current development status
  help                  Show this help message

${colors.bright}RELEASE OPTIONS:${colors.reset}
  --policy <policy>     Update policy (force|critical|optional)
  --changelog <text>    Custom changelog text
  --force               Skip pre-flight checks
  --skip-tests          Skip running tests
  --skip-build          Skip building application
  --dry-run             Show what would be done without doing it

${colors.bright}EXAMPLES:${colors.reset}
  # Standard patch release
  node scripts/dev-workflow.mjs release patch

  # Minor release with custom changelog
  node scripts/dev-workflow.mjs release minor --changelog "New features added"

  # Critical hotfix
  node scripts/dev-workflow.mjs hotfix 1.2.1 --policy critical

  # Check current status
  node scripts/dev-workflow.mjs status

  # Prepare for release
  node scripts/dev-workflow.mjs prepare-release

${colors.bright}WORKFLOW:${colors.reset}
  1. Check status: node scripts/dev-workflow.mjs status
  2. Prepare release: node scripts/dev-workflow.mjs prepare-release
  3. Create release: node scripts/dev-workflow.mjs release [type]
  4. Push and deploy: git push && ./deploy-<version>.sh

${colors.bright}INTEGRATION:${colors.reset}
  This script integrates with:
  - Git version control and tagging
  - Package.json version management
  - Test automation
  - Build processes
  - Version entry creation
  - Database migration generation
`);
  }
}

// Run CLI if this file is executed directly
if (process.argv[1] && process.argv[1].endsWith('dev-workflow.mjs')) {
  WorkflowCLI.run();
}

export {
  ReleaseManager,
  WorkflowCLI
};