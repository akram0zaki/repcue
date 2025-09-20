#!/usr/bin/env node

/**
 * Version Management Build Script
 *
 * Handles automatic version creation and management for RepCue PWA updates.
 * Integrates with git to capture build metadata and validates version formats.
 *
 * Usage:
 *   node scripts/version-management.mjs create [version] [options]
 *   node scripts/version-management.mjs validate [version]
 *   node scripts/version-management.mjs list
 *   node scripts/version-management.mjs build-info
 *
 * Examples:
 *   node scripts/version-management.mjs create 1.2.0 --policy optional
 *   node scripts/version-management.mjs create 1.2.1 --policy critical --changelog "Bug fixes"
 *   node scripts/version-management.mjs validate 1.2.0
 *   node scripts/version-management.mjs build-info
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../..');

// Color utilities for console output
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
  header: (msg) => console.log(`${colors.bright}${colors.cyan}${msg}${colors.reset}`)
};

/**
 * Git integration utilities
 */
class GitUtils {
  /**
   * Get current git commit hash
   */
  static getCommitHash(short = false) {
    try {
      const format = short ? '--short' : '';
      return execSync(`git rev-parse ${format} HEAD`, {
        cwd: projectRoot,
        encoding: 'utf8'
      }).trim();
    } catch (error) {
      log.warning('Could not get git commit hash');
      return 'unknown';
    }
  }

  /**
   * Get current git branch name
   */
  static getBranch() {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: projectRoot,
        encoding: 'utf8'
      }).trim();
    } catch (error) {
      log.warning('Could not get git branch name');
      return 'unknown';
    }
  }

  /**
   * Get git commit message
   */
  static getCommitMessage() {
    try {
      return execSync('git log -1 --pretty=%B', {
        cwd: projectRoot,
        encoding: 'utf8'
      }).trim();
    } catch (error) {
      log.warning('Could not get git commit message');
      return 'No commit message available';
    }
  }

  /**
   * Get git author information
   */
  static getAuthor() {
    try {
      const name = execSync('git log -1 --pretty=%an', {
        cwd: projectRoot,
        encoding: 'utf8'
      }).trim();
      const email = execSync('git log -1 --pretty=%ae', {
        cwd: projectRoot,
        encoding: 'utf8'
      }).trim();
      return { name, email };
    } catch (error) {
      log.warning('Could not get git author information');
      return { name: 'unknown', email: 'unknown' };
    }
  }

  /**
   * Check if working directory is clean
   */
  static isWorkingDirectoryClean() {
    try {
      const status = execSync('git status --porcelain', {
        cwd: projectRoot,
        encoding: 'utf8'
      }).trim();
      return status === '';
    } catch (error) {
      log.warning('Could not check git status');
      return false;
    }
  }

  /**
   * Get list of modified files
   */
  static getModifiedFiles() {
    try {
      const files = execSync('git status --porcelain', {
        cwd: projectRoot,
        encoding: 'utf8'
      }).trim();
      return files.split('\n').filter(line => line.trim()).map(line => line.substring(3));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get git tag for current commit (if any)
   */
  static getCurrentTag() {
    try {
      return execSync('git describe --exact-match --tags HEAD', {
        cwd: projectRoot,
        encoding: 'utf8'
      }).trim();
    } catch (error) {
      return null;
    }
  }

  /**
   * Create git tag for version
   */
  static createTag(version, message) {
    try {
      execSync(`git tag -a v${version} -m "${message}"`, {
        cwd: projectRoot
      });
      log.success(`Created git tag: v${version}`);
      return true;
    } catch (error) {
      log.error(`Failed to create git tag: ${error.message}`);
      return false;
    }
  }
}

/**
 * Version validation utilities
 */
class VersionValidator {
  /**
   * Validate semantic version format
   */
  static validateSemVer(version) {
    const semVerRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
    const match = version.match(semVerRegex);

    if (!match) {
      return {
        valid: false,
        error: 'Version must follow semantic versioning format (e.g., 1.2.3, 1.2.3-beta.1, 1.2.3+build.123)'
      };
    }

    const [, major, minor, patch, prerelease, build] = match;

    return {
      valid: true,
      major: parseInt(major, 10),
      minor: parseInt(minor, 10),
      patch: parseInt(patch, 10),
      prerelease,
      build
    };
  }

  /**
   * Compare two semantic versions
   */
  static compareVersions(v1, v2) {
    const parse1 = this.validateSemVer(v1);
    const parse2 = this.validateSemVer(v2);

    if (!parse1.valid || !parse2.valid) {
      throw new Error('Invalid version format for comparison');
    }

    // Compare major
    if (parse1.major !== parse2.major) {
      return parse1.major - parse2.major;
    }

    // Compare minor
    if (parse1.minor !== parse2.minor) {
      return parse1.minor - parse2.minor;
    }

    // Compare patch
    if (parse1.patch !== parse2.patch) {
      return parse1.patch - parse2.patch;
    }

    // Handle prerelease comparison
    if (parse1.prerelease && parse2.prerelease) {
      return parse1.prerelease.localeCompare(parse2.prerelease);
    }

    // Stable version > prerelease
    if (parse1.prerelease && !parse2.prerelease) return -1;
    if (!parse1.prerelease && parse2.prerelease) return 1;

    return 0;
  }

  /**
   * Check if version exists in existing versions
   */
  static checkVersionExists(version, existingVersions) {
    return existingVersions.some(v => v.version_number === version);
  }

  /**
   * Validate update policy
   */
  static validateUpdatePolicy(policy) {
    const validPolicies = ['force', 'critical', 'optional'];
    if (!validPolicies.includes(policy)) {
      return {
        valid: false,
        error: `Invalid update policy '${policy}'. Must be one of: ${validPolicies.join(', ')}`
      };
    }
    return { valid: true };
  }

  /**
   * Validate changelog format
   */
  static validateChangelog(changelog) {
    if (typeof changelog === 'string') {
      if (changelog.trim().length === 0) {
        return {
          valid: false,
          error: 'Changelog cannot be empty'
        };
      }
      return { valid: true };
    }

    if (typeof changelog === 'object' && changelog !== null) {
      const validKeys = ['new_features', 'improvements', 'bug_fixes', 'security_updates'];
      const hasValidKeys = Object.keys(changelog).some(key => validKeys.includes(key));

      if (!hasValidKeys) {
        return {
          valid: false,
          error: `Changelog object must contain at least one of: ${validKeys.join(', ')}`
        };
      }

      // Validate that all values are arrays of strings
      for (const [key, value] of Object.entries(changelog)) {
        if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
          return {
            valid: false,
            error: `Changelog property '${key}' must be an array of strings`
          };
        }
      }

      return { valid: true };
    }

    return {
      valid: false,
      error: 'Changelog must be a string or structured object'
    };
  }
}

/**
 * Build metadata collection
 */
class BuildMetadata {
  /**
   * Get current build metadata
   */
  static getBuildInfo() {
    const git = {
      commit_hash: GitUtils.getCommitHash(),
      commit_hash_short: GitUtils.getCommitHash(true),
      branch: GitUtils.getBranch(),
      commit_message: GitUtils.getCommitMessage(),
      author: GitUtils.getAuthor(),
      tag: GitUtils.getCurrentTag(),
      is_clean: GitUtils.isWorkingDirectoryClean(),
      modified_files: GitUtils.isWorkingDirectoryClean() ? [] : GitUtils.getModifiedFiles()
    };

    const build = {
      timestamp: new Date().toISOString(),
      build_number: this.generateBuildNumber(),
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
      ci: process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true',
      ci_provider: this.detectCIProvider()
    };

    const package_info = this.getPackageInfo();

    return {
      git,
      build,
      package_info
    };
  }

  /**
   * Generate build number from timestamp and commit
   */
  static generateBuildNumber() {
    const timestamp = Date.now();
    const commitShort = GitUtils.getCommitHash(true);
    return `${timestamp}-${commitShort}`;
  }

  /**
   * Detect CI provider
   */
  static detectCIProvider() {
    if (process.env.GITHUB_ACTIONS) return 'github-actions';
    if (process.env.GITLAB_CI) return 'gitlab';
    if (process.env.TRAVIS) return 'travis';
    if (process.env.CIRCLECI) return 'circle-ci';
    if (process.env.JENKINS_URL) return 'jenkins';
    if (process.env.CI) return 'unknown-ci';
    return 'local';
  }

  /**
   * Get package.json information
   */
  static getPackageInfo() {
    try {
      const packagePath = join(projectRoot, 'apps/frontend/package.json');
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));

      return {
        name: packageJson.name,
        version: packageJson.version,
        dependencies_count: Object.keys(packageJson.dependencies || {}).length,
        dev_dependencies_count: Object.keys(packageJson.devDependencies || {}).length
      };
    } catch (error) {
      log.warning('Could not read package.json information');
      return {
        name: 'unknown',
        version: 'unknown',
        dependencies_count: 0,
        dev_dependencies_count: 0
      };
    }
  }
}

/**
 * Version entry creation and management
 */
class VersionManager {
  /**
   * Create a new version entry
   */
  static async createVersionEntry(version, options = {}) {
    log.header(`Creating version entry: ${version}`);

    // Validate version format
    const versionValidation = VersionValidator.validateSemVer(version);
    if (!versionValidation.valid) {
      log.error(`Invalid version format: ${versionValidation.error}`);
      process.exit(1);
    }

    // Validate update policy
    const policy = options.policy || 'optional';
    const policyValidation = VersionValidator.validateUpdatePolicy(policy);
    if (!policyValidation.valid) {
      log.error(`Invalid update policy: ${policyValidation.error}`);
      process.exit(1);
    }

    // Validate changelog if provided
    if (options.changelog) {
      const changelogValidation = VersionValidator.validateChangelog(options.changelog);
      if (!changelogValidation.valid) {
        log.error(`Invalid changelog: ${changelogValidation.error}`);
        process.exit(1);
      }
    }

    // Get build metadata
    const buildInfo = BuildMetadata.getBuildInfo();

    // Check for uncommitted changes (warning only for non-CI)
    if (!buildInfo.git.is_clean && !buildInfo.build.ci) {
      log.warning('Working directory has uncommitted changes:');
      buildInfo.git.modified_files.forEach(file => {
        log.warning(`  - ${file}`);
      });

      if (!options.force) {
        log.error('Use --force to create version with uncommitted changes');
        process.exit(1);
      }
    }

    // Create version entry object
    const versionEntry = {
      id: this.generateUUID(),
      version_number: version,
      build_number: buildInfo.build.build_number,
      release_date: buildInfo.build.timestamp,
      update_policy: policy,
      changelog: options.changelog || `Release ${version}`,
      git_commit_hash: buildInfo.git.commit_hash,
      git_branch: buildInfo.git.branch,
      reviewer: buildInfo.git.author.name || 'unknown',
      is_active: options.active !== false,
      metadata: {
        git: buildInfo.git,
        build: buildInfo.build,
        package_info: buildInfo.package_info,
        created_by_script: true,
        script_version: '1.0.0'
      }
    };

    // Save to file for manual database insertion or CI/CD integration
    const outputFile = join(projectRoot, `version-entry-${version}.json`);
    writeFileSync(outputFile, JSON.stringify(versionEntry, null, 2));

    log.success(`Version entry created: ${outputFile}`);
    log.info(`Version: ${version}`);
    log.info(`Policy: ${policy}`);
    log.info(`Build: ${buildInfo.build.build_number}`);
    log.info(`Commit: ${buildInfo.git.commit_hash_short} (${buildInfo.git.branch})`);
    log.info(`Author: ${buildInfo.git.author.name} <${buildInfo.git.author.email}>`);

    // Create git tag if requested
    if (options.tag && !options.dryRun) {
      const tagMessage = `Release ${version}${policy === 'force' ? ' (FORCE UPDATE)' : ''}`;
      GitUtils.createTag(version, tagMessage);
    }

    // Generate SQL migration if requested
    if (options.sql) {
      this.generateSQLMigration(versionEntry);
    }

    // Generate deployment script if requested
    if (options.deploy) {
      this.generateDeploymentScript(versionEntry);
    }

    return versionEntry;
  }

  /**
   * Generate UUID for version entry
   */
  static generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Generate SQL migration for version entry
   */
  static generateSQLMigration(versionEntry) {
    const timestamp = new Date().toISOString().replace(/[:-]/g, '').split('.')[0];
    const filename = `${timestamp}_add_version_${versionEntry.version_number.replace(/\./g, '_')}.sql`;
    const filepath = join(projectRoot, 'supabase/migrations', filename);

    const sql = `-- Migration: Add version ${versionEntry.version_number}
-- Created: ${new Date().toISOString()}
-- Build: ${versionEntry.build_number}

INSERT INTO app_versions (
  id,
  version_number,
  build_number,
  release_date,
  update_policy,
  changelog,
  git_commit_hash,
  git_branch,
  reviewer,
  is_active,
  metadata
) VALUES (
  '${versionEntry.id}',
  '${versionEntry.version_number}',
  '${versionEntry.build_number}',
  '${versionEntry.release_date}',
  '${versionEntry.update_policy}',
  '${JSON.stringify(versionEntry.changelog).replace(/'/g, "''")}',
  '${versionEntry.git_commit_hash}',
  '${versionEntry.git_branch}',
  '${versionEntry.reviewer}',
  ${versionEntry.is_active},
  '${JSON.stringify(versionEntry.metadata, null, 2).replace(/'/g, "''")}'
);

-- Add audit entry
INSERT INTO version_audit (
  version_id,
  action,
  changed_by,
  changes
) VALUES (
  '${versionEntry.id}',
  'created',
  '${versionEntry.reviewer}',
  '${JSON.stringify({
    version: versionEntry.version_number,
    policy: versionEntry.update_policy,
    automated: true
  }).replace(/'/g, "''")}'
);
`;

    writeFileSync(filepath, sql);
    log.success(`SQL migration generated: ${filename}`);
  }

  /**
   * Generate deployment script
   */
  static generateDeploymentScript(versionEntry) {
    const filename = `deploy-${versionEntry.version_number}.sh`;
    const filepath = join(projectRoot, filename);

    const script = `#!/bin/bash
# Deployment script for RepCue ${versionEntry.version_number}
# Generated: ${new Date().toISOString()}

set -e

echo "🚀 Deploying RepCue ${versionEntry.version_number}"
echo "Policy: ${versionEntry.update_policy}"
echo "Build: ${versionEntry.build_number}"
echo "Commit: ${versionEntry.git_commit_hash}"

# Apply database migrations
echo "📦 Applying database migrations..."
supabase db push

# Deploy edge functions
echo "⚡ Deploying edge functions..."
supabase functions deploy check-version

# Build and deploy frontend
echo "🏗️  Building frontend..."
pnpm build:prod

echo "✅ Deployment complete!"
echo "Version ${versionEntry.version_number} is now live"

# Optional: Run smoke tests
if [ "$RUN_SMOKE_TESTS" = "true" ]; then
  echo "🧪 Running smoke tests..."
  pnpm test:e2e
fi
`;

    writeFileSync(filepath, script);
    execSync(`chmod +x ${filepath}`);
    log.success(`Deployment script generated: ${filename}`);
  }

  /**
   * List existing versions (from JSON files in project)
   */
  static listVersions() {
    log.header('Existing Version Entries');

    try {
      const files = execSync('find . -name "version-entry-*.json" -type f', {
        cwd: projectRoot,
        encoding: 'utf8'
      }).trim().split('\n').filter(Boolean);

      if (files.length === 0) {
        log.info('No version entries found');
        return;
      }

      const versions = files.map(file => {
        try {
          const content = readFileSync(join(projectRoot, file), 'utf8');
          return JSON.parse(content);
        } catch (error) {
          log.warning(`Could not parse ${file}: ${error.message}`);
          return null;
        }
      }).filter(Boolean);

      // Sort by version
      versions.sort((a, b) => {
        try {
          return VersionValidator.compareVersions(b.version_number, a.version_number);
        } catch {
          return b.version_number.localeCompare(a.version_number);
        }
      });

      versions.forEach(version => {
        const status = version.is_active ? '🟢 Active' : '🔴 Inactive';
        const policy = version.update_policy === 'force' ? '🚨 FORCE' :
                     version.update_policy === 'critical' ? '⚠️  CRITICAL' : '📝 Optional';

        console.log(`${status} ${version.version_number} - ${policy}`);
        console.log(`   Build: ${version.build_number}`);
        console.log(`   Commit: ${version.git_commit_hash?.substring(0, 8)} (${version.git_branch})`);
        console.log(`   Date: ${new Date(version.release_date).toLocaleString()}`);
        console.log('');
      });

    } catch (error) {
      log.error(`Could not list versions: ${error.message}`);
    }
  }

  /**
   * Show current build information
   */
  static showBuildInfo() {
    log.header('Current Build Information');

    const buildInfo = BuildMetadata.getBuildInfo();

    console.log(`${colors.bright}Git Information:${colors.reset}`);
    console.log(`  Commit: ${buildInfo.git.commit_hash}`);
    console.log(`  Branch: ${buildInfo.git.branch}`);
    console.log(`  Author: ${buildInfo.git.author.name} <${buildInfo.git.author.email}>`);
    console.log(`  Clean: ${buildInfo.git.is_clean ? '✅' : '❌'}`);
    console.log(`  Tag: ${buildInfo.git.tag || 'none'}`);

    if (!buildInfo.git.is_clean) {
      console.log(`  Modified files:`);
      buildInfo.git.modified_files.forEach(file => {
        console.log(`    - ${file}`);
      });
    }

    console.log(`\n${colors.bright}Build Information:${colors.reset}`);
    console.log(`  Build Number: ${buildInfo.build.build_number}`);
    console.log(`  Timestamp: ${buildInfo.build.timestamp}`);
    console.log(`  Node Version: ${buildInfo.build.node_version}`);
    console.log(`  Platform: ${buildInfo.build.platform} (${buildInfo.build.arch})`);
    console.log(`  CI: ${buildInfo.build.ci ? '✅' : '❌'}`);
    console.log(`  CI Provider: ${buildInfo.build.ci_provider}`);

    console.log(`\n${colors.bright}Package Information:${colors.reset}`);
    console.log(`  Name: ${buildInfo.package_info.name}`);
    console.log(`  Version: ${buildInfo.package_info.version}`);
    console.log(`  Dependencies: ${buildInfo.package_info.dependencies_count}`);
    console.log(`  Dev Dependencies: ${buildInfo.package_info.dev_dependencies_count}`);
  }
}

/**
 * CLI interface
 */
class CLI {
  static run() {
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
      case 'create':
        this.handleCreate(args.slice(1));
        break;

      case 'validate':
        this.handleValidate(args.slice(1));
        break;

      case 'list':
        VersionManager.listVersions();
        break;

      case 'build-info':
        VersionManager.showBuildInfo();
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

  static handleCreate(args) {
    const version = args[0];

    if (!version) {
      log.error('Version number is required');
      log.info('Usage: node scripts/version-management.mjs create <version> [options]');
      process.exit(1);
    }

    const options = this.parseOptions(args.slice(1));
    VersionManager.createVersionEntry(version, options);
  }

  static handleValidate(args) {
    const version = args[0];

    if (!version) {
      log.error('Version number is required');
      log.info('Usage: node scripts/version-management.mjs validate <version>');
      process.exit(1);
    }

    const validation = VersionValidator.validateSemVer(version);

    if (validation.valid) {
      log.success(`Version ${version} is valid`);
      log.info(`  Major: ${validation.major}`);
      log.info(`  Minor: ${validation.minor}`);
      log.info(`  Patch: ${validation.patch}`);
      if (validation.prerelease) log.info(`  Prerelease: ${validation.prerelease}`);
      if (validation.build) log.info(`  Build: ${validation.build}`);
    } else {
      log.error(`Version ${version} is invalid: ${validation.error}`);
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
        case '--tag':
          options.tag = true;
          break;
        case '--sql':
          options.sql = true;
          break;
        case '--deploy':
          options.deploy = true;
          break;
        case '--dry-run':
          options.dryRun = true;
          break;
        case '--active':
          options.active = args[++i] !== 'false';
          break;
        default:
          log.warning(`Unknown option: ${arg}`);
      }
    }

    return options;
  }

  static showHelp() {
    console.log(`
${colors.bright}${colors.cyan}RepCue Version Management Script${colors.reset}

${colors.bright}USAGE:${colors.reset}
  node scripts/version-management.mjs <command> [options]

${colors.bright}COMMANDS:${colors.reset}
  create <version>    Create a new version entry
  validate <version>  Validate version format
  list               List existing version entries
  build-info         Show current build information
  help               Show this help message

${colors.bright}CREATE OPTIONS:${colors.reset}
  --policy <policy>      Update policy (force|critical|optional, default: optional)
  --changelog <text>     Changelog text or JSON object
  --force               Create version even with uncommitted changes
  --tag                 Create git tag for this version
  --sql                 Generate SQL migration file
  --deploy              Generate deployment script
  --dry-run             Show what would be created without creating it
  --active <true|false> Set version as active (default: true)

${colors.bright}EXAMPLES:${colors.reset}
  # Create a standard release
  node scripts/version-management.mjs create 1.2.0 --policy optional --tag

  # Create a critical security update
  node scripts/version-management.mjs create 1.1.1 --policy critical --changelog "Security fixes"

  # Create a force update with all automation
  node scripts/version-management.mjs create 2.0.0 --policy force --tag --sql --deploy

  # Validate version format
  node scripts/version-management.mjs validate 1.2.3-beta.1

  # Show current build info
  node scripts/version-management.mjs build-info

${colors.bright}AUTOMATION:${colors.reset}
  This script integrates with CI/CD pipelines and can be used in:
  - GitHub Actions workflows
  - Build processes
  - Release automation
  - Database migration generation
`);
  }
}

// Run CLI if this file is executed directly
if (process.argv[1] && process.argv[1].endsWith('version-management.mjs')) {
  CLI.run();
}

export {
  GitUtils,
  VersionValidator,
  BuildMetadata,
  VersionManager,
  CLI
};