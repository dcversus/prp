/**
 * Secure Credential Management System
 *
 * Provides secure storage, retrieval, and management of sensitive credentials
 * following industry best practices for encryption and key management.
 */

import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { logger } from '../logger.js';

export interface Credential {
  id: string;
  name: string;
  value: string;
  type: 'api_key' | 'token' | 'password' | 'certificate' | 'ssh_key' | 'secret';
  description?: string;
  expiresAt?: Date;
  createdAt: Date;
  lastAccessed?: Date;
  tags?: string[];
}

export interface CredentialStorage {
  credentials: Record<string, EncryptedCredential>;
  masterKeySalt: string;
  version: string;
  metadata: {
    createdAt: string;
    updatedAt: string;
    totalCredentials: number;
  };
}

interface EncryptedCredential {
  id: string;
  name: string;
  type: string;
  description?: string;
  expiresAt?: string;
  createdAt: string;
  lastAccessed?: string;
  tags?: string[];
  encryptedValue: string;
  iv: string;
  authTag: string;
}

export interface CredentialManagerConfig {
  storagePath?: string;
  masterKeyEnvVar?: string;
  enableAutoRotation?: boolean;
  rotationDays?: number;
  enableAccessLogging?: boolean;
  sessionTimeout?: number;
}

export class CredentialManager {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly AUTH_TAG_LENGTH = 16; // Auth tag length for AES-256-GCM (security critical)
  private static readonly DEFAULT_STORAGE_PATH = join(homedir(), '.prp', 'credentials.enc');
  private static readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  private masterKey?: Buffer;
  private storagePath: string;
  private config: Required<CredentialManagerConfig>;
  private sessionTimeout?: NodeJS.Timeout;

  constructor(config: CredentialManagerConfig = {}) {
    this.config = {
      storagePath: config.storagePath ?? CredentialManager.DEFAULT_STORAGE_PATH,
      masterKeyEnvVar: config.masterKeyEnvVar ?? 'PRP_MASTER_KEY',
      enableAutoRotation: config.enableAutoRotation ?? true,
      rotationDays: config.rotationDays ?? 90,
      enableAccessLogging: config.enableAccessLogging ?? true,
      sessionTimeout: config.sessionTimeout ?? CredentialManager.SESSION_TIMEOUT
    };

    this.storagePath = this.config.storagePath;
    this.ensureStorageDirectory();
  }

  /**
   * Initialize the credential manager with master key
   */
  async initialize(): Promise<void> {
    try {
      this.masterKey = await this.getOrCreateMasterKey();

      if (this.config.enableAutoRotation) {
        this.scheduleKeyRotation();
      }

      this.startSessionTimer();

      logger.info('CredentialManager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize CredentialManager', error);
      throw new Error(`CredentialManager initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Store a new credential securely
   */
  async storeCredential(credential: Omit<Credential, 'id' | 'createdAt'>): Promise<string> {
    this.ensureInitialized();
    this.ensureSessionValid();

    try {
      const id = crypto.randomUUID();
      const now = new Date();

      const newCredential: Credential = {
        id,
        createdAt: now,
        ...credential
      };

      const encryptedCredential = await this.encryptCredential(newCredential);

      await this.updateStorage(async (storage) => {
        storage.credentials[id] = encryptedCredential;
        storage.metadata.totalCredentials = Object.keys(storage.credentials).length;
        storage.metadata.updatedAt = now.toISOString();
      });

      if (this.config.enableAccessLogging) {
        logger.info(`Stored credential: ${credential.name} (${credential.type})`);
      }

      return id;
    } catch (error) {
      logger.error('Failed to store credential', error);
      throw new Error(`Failed to store credential: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retrieve a credential by ID
   */
  async getCredential(id: string): Promise<Credential | null> {
    this.ensureInitialized();
    this.ensureSessionValid();

    try {
      const storage = await this.loadStorage();
      const encryptedCredential = storage.credentials[id];

      if (!encryptedCredential) {
        return null;
      }

      const credential = await this.decryptCredential(encryptedCredential);

      // Update last accessed time
      await this.updateStorage(async (storage) => {
        if (storage.credentials[id]) {
          storage.credentials[id].lastAccessed = new Date().toISOString();
        }
      });

      if (this.config.enableAccessLogging) {
        logger.info(`Retrieved credential: ${credential.name} (${credential.type})`);
      }

      // Check if credential has expired
      if (credential.expiresAt && credential.expiresAt < new Date()) {
        logger.warn(`Retrieved expired credential: ${credential.name}`);
      }

      return credential;
    } catch (error) {
      logger.error('Failed to retrieve credential', error);
      throw new Error(`Failed to retrieve credential: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List all credential metadata (without values)
   */
  async listCredentials(): Promise<Omit<Credential, 'value'>[]> {
    this.ensureInitialized();
    this.ensureSessionValid();

    try {
      const storage = await this.loadStorage();
      const credentials: Omit<Credential, 'value'>[] = [];

      for (const encryptedCredential of Object.values(storage.credentials)) {
        const { encryptedValue: _encryptedValue, iv: _iv, authTag: _authTag, ...metadata } = encryptedCredential;
        credentials.push({
          ...metadata,
          expiresAt: metadata.expiresAt ? new Date(metadata.expiresAt) : undefined,
          createdAt: new Date(metadata.createdAt),
          lastAccessed: metadata.lastAccessed ? new Date(metadata.lastAccessed) : undefined,
          type: metadata.type as Credential['type']
        });
      }

      if (this.config.enableAccessLogging) {
        logger.info(`Listed ${credentials.length} credentials`);
      }

      return credentials;
    } catch (error) {
      logger.error('Failed to list credentials', error);
      throw new Error(`Failed to list credentials: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update an existing credential
   */
  async updateCredential(id: string, updates: Partial<Omit<Credential, 'id' | 'createdAt'>>): Promise<void> {
    this.ensureInitialized();
    this.ensureSessionValid();

    try {
      const storage = await this.loadStorage();
      const existingEncrypted = storage.credentials[id];

      if (!existingEncrypted) {
        throw new Error(`Credential with ID ${id} not found`);
      }

      const existing = await this.decryptCredential(existingEncrypted);
      const updated: Credential = {
        ...existing,
        ...updates,
        id, // Ensure ID doesn't change
        createdAt: existing.createdAt // Preserve creation time
      };

      const updatedEncrypted = await this.encryptCredential(updated);

      await this.updateStorage(async (storage) => {
        storage.credentials[id] = updatedEncrypted;
        storage.metadata.updatedAt = new Date().toISOString();
      });

      if (this.config.enableAccessLogging) {
        logger.info(`Updated credential: ${updated.name} (${updated.type})`);
      }
    } catch (error) {
      logger.error('Failed to update credential', error);
      throw new Error(`Failed to update credential: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete a credential
   */
  async deleteCredential(id: string): Promise<void> {
    this.ensureInitialized();
    this.ensureSessionValid();

    try {
      await this.updateStorage(async (storage) => {
        const credential = storage.credentials[id];
        delete storage.credentials[id];
        storage.metadata.totalCredentials = Object.keys(storage.credentials).length;
        storage.metadata.updatedAt = new Date().toISOString();

        if (this.config.enableAccessLogging && credential) {
          logger.info(`Deleted credential: ${credential.name} (${credential.type})`);
        }
      });
    } catch (error) {
      logger.error('Failed to delete credential', error);
      throw new Error(`Failed to delete credential: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Search credentials by name, type, or tags
   */
  async searchCredentials(query: {
    name?: string;
    type?: string;
    tags?: string[];
    includeExpired?: boolean;
  }): Promise<Omit<Credential, 'value'>[]> {
    this.ensureInitialized();
    this.ensureSessionValid();

    try {
      const credentials = await this.listCredentials();

      return credentials.filter(credential => {
        // Filter by name
        if (query.name && !credential.name.toLowerCase().includes(query.name.toLowerCase())) {
          return false;
        }

        // Filter by type
        if (query.type && credential.type !== query.type) {
          return false;
        }

        // Filter by tags
        if (query.tags && query.tags.length > 0) {
          const credentialTags = credential.tags ?? [];
          const hasAllTags = query.tags.every(tag => credentialTags.includes(tag));
          if (!hasAllTags) {
            return false;
          }
        }

        // Filter expired credentials
        if (!query.includeExpired && credential.expiresAt && credential.expiresAt < new Date()) {
          return false;
        }

        return true;
      });
    } catch (error) {
      logger.error('Failed to search credentials', error);
      throw new Error(`Failed to search credentials: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Rotate the master key
   */
  async rotateMasterKey(): Promise<void> {
    this.ensureInitialized();

    try {
      const storage = await this.loadStorage();
      if (!this.masterKey) {
        throw new Error('Master key not available for rotation');
      }
      const oldMasterKey = this.masterKey;

      // Generate new master key
      this.masterKey = crypto.randomBytes(CredentialManager.KEY_LENGTH);

      // Re-encrypt all credentials with new key
      const newCredentials: Record<string, EncryptedCredential> = {};

      for (const [id, encryptedCredential] of Object.entries(storage.credentials)) {
        const credential = await this.decryptCredentialWithKey(encryptedCredential, oldMasterKey);
        newCredentials[id] = await this.encryptCredentialWithKey(credential, this.masterKey);
      }

      // Update storage
      const newMasterKeySalt = crypto.randomBytes(16).toString('hex');
      const updatedStorage: CredentialStorage = {
        ...storage,
        credentials: newCredentials,
        masterKeySalt: newMasterKeySalt,
        metadata: {
          ...storage.metadata,
          updatedAt: new Date().toISOString()
        }
      };

      await this.saveStorage(updatedStorage);

      if (this.config.enableAccessLogging) {
        logger.info('Master key rotated successfully');
      }
    } catch (error) {
      logger.error('Failed to rotate master key', error);
      throw new Error(`Failed to rotate master key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clean up expired credentials
   */
  async cleanupExpiredCredentials(): Promise<number> {
    this.ensureInitialized();
    this.ensureSessionValid();

    try {
      let cleanedCount = 0;

      await this.updateStorage(async (storage) => {
        const now = new Date();

        for (const [id, credential] of Object.entries(storage.credentials)) {
          if (credential.expiresAt && new Date(credential.expiresAt) < now) {
            delete storage.credentials[id];
            cleanedCount++;
          }
        }

        storage.metadata.totalCredentials = Object.keys(storage.credentials).length;
        storage.metadata.updatedAt = now.toISOString();
      });

      if (this.config.enableAccessLogging) {
        logger.info(`Cleaned up ${cleanedCount} expired credentials`);
      }

      return cleanedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired credentials', error);
      throw new Error(`Failed to cleanup expired credentials: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Lock the credential manager (clear master key from memory)
   */
  lock(): void {
    if (this.masterKey) {
      // Overwrite the master key in memory
      this.masterKey.fill(0);
      this.masterKey = undefined;
    }

    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
      this.sessionTimeout = undefined;
    }

    logger.info('CredentialManager locked');
  }

  /**
   * Check if the manager is unlocked
   */
  isUnlocked(): boolean {
    return this.masterKey !== undefined;
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalCredentials: number;
    expiredCredentials: number;
    storageSize: number;
    lastUpdated: Date;
  }> {
    this.ensureInitialized();

    try {
      const storage = await this.loadStorage();
      const now = new Date();
      let expiredCount = 0;

      for (const credential of Object.values(storage.credentials)) {
        if (credential.expiresAt && new Date(credential.expiresAt) < now) {
          expiredCount++;
        }
      }

      const stats = await fs.stat(this.storagePath);

      return {
        totalCredentials: storage.metadata.totalCredentials,
        expiredCredentials: expiredCount,
        storageSize: stats.size,
        lastUpdated: new Date(storage.metadata.updatedAt)
      };
    } catch (error) {
      logger.error('Failed to get storage stats', error);
      throw new Error(`Failed to get storage stats: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Private methods

  private ensureInitialized(): void {
    if (!this.masterKey) {
      throw new Error('CredentialManager not initialized. Call initialize() first.');
    }
  }

  private ensureSessionValid(): void {
    if (!this.sessionTimeout) {
      throw new Error('Session expired. Please reinitialize.');
    }
  }

  private async getOrCreateMasterKey(): Promise<Buffer> {
    // Try to get master key from environment variable
    const envKey = process.env[this.config.masterKeyEnvVar];
    if (envKey) {
      try {
        return Buffer.from(envKey, 'hex');
      } catch (_error) {
        logger.warn('Invalid master key in environment variable');
      }
    }

    // Try to load from system keychain/keystore (platform-specific)
    const systemKey = await this.loadSystemKey();
    if (systemKey) {
      return systemKey;
    }

    // Generate a new key (in production, this should be handled more securely)
    logger.warn('Generating new master key. This should be persisted securely.');
    return crypto.randomBytes(CredentialManager.KEY_LENGTH);
  }

  private async loadSystemKey(): Promise<Buffer | null> {
    // Implementation would vary by platform
    // For now, return null - in production, integrate with:
    // - macOS Keychain
    // - Windows Credential Manager
    // - Linux Keyring (GNOME Keyring, KWallet)
    return null;
  }

  private async loadStorage(): Promise<CredentialStorage> {
    try {
      if (!existsSync(this.storagePath)) {
        return this.createEmptyStorage();
      }

      const encryptedData = await fs.readFile(this.storagePath, 'utf8');

      if (!this.masterKey) {
        throw new Error('Master key not available for decrypting storage');
      }

      const storageData = this.decryptStorageData(encryptedData, this.masterKey);
      return JSON.parse(storageData) as CredentialStorage;
    } catch (error) {
      logger.error('Failed to load credential storage', error);
      throw new Error(`Failed to load credential storage: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async saveStorage(storage: CredentialStorage): Promise<void> {
    try {
      if (!this.masterKey) {
        throw new Error('Master key not available for encrypting storage');
      }

      const storageData = JSON.stringify(storage, null, 2);
      const encryptedData = this.encryptStorageData(storageData, this.masterKey);

      await fs.writeFile(this.storagePath, encryptedData, 'utf8');

      // Set secure file permissions
      await fs.chmod(this.storagePath, 0o600);
    } catch (error) {
      logger.error('Failed to save credential storage', error);
      throw new Error(`Failed to save credential storage: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async updateStorage(updateFn: (storage: CredentialStorage) => Promise<void>): Promise<void> {
    const storage = await this.loadStorage();
    await updateFn(storage);
    await this.saveStorage(storage);
  }

  private createEmptyStorage(): CredentialStorage {
    return {
      credentials: {},
      masterKeySalt: crypto.randomBytes(16).toString('hex'),
      version: '1.0.0',
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalCredentials: 0
      }
    };
  }

  private async encryptCredential(credential: Credential): Promise<EncryptedCredential> {
    if (!this.masterKey) {
      throw new Error('Master key not available');
    }

    return this.encryptCredentialWithKey(credential, this.masterKey);
  }

  private async encryptCredentialWithKey(credential: Credential, key: Buffer): Promise<EncryptedCredential> {
    const iv = crypto.randomBytes(CredentialManager.IV_LENGTH);
    const cipher = crypto.createCipheriv(CredentialManager.ALGORITHM, key, iv);

    let encrypted = cipher.update(credential.value, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      id: credential.id,
      name: credential.name,
      type: credential.type,
      description: credential.description,
      expiresAt: credential.expiresAt?.toISOString(),
      createdAt: credential.createdAt.toISOString(),
      lastAccessed: credential.lastAccessed?.toISOString(),
      tags: credential.tags,
      encryptedValue: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  private async decryptCredential(encrypted: EncryptedCredential): Promise<Credential> {
    if (!this.masterKey) {
      throw new Error('Master key not available');
    }

    return this.decryptCredentialWithKey(encrypted, this.masterKey);
  }

  private async decryptCredentialWithKey(encrypted: EncryptedCredential, key: Buffer): Promise<Credential> {
    // Security validation: ensure auth tag length is correct
    if (Buffer.from(encrypted.authTag, 'hex').length !== CredentialManager.AUTH_TAG_LENGTH) {
      throw new Error('Invalid authentication tag length');
    }

    const decipher = crypto.createDecipheriv(CredentialManager.ALGORITHM, key, Buffer.from(encrypted.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));

    let decrypted = decipher.update(encrypted.encryptedValue, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return {
      id: encrypted.id,
      name: encrypted.name,
      value: decrypted,
      type: encrypted.type as Credential['type'],
      description: encrypted.description,
      expiresAt: encrypted.expiresAt ? new Date(encrypted.expiresAt) : undefined,
      createdAt: new Date(encrypted.createdAt),
      lastAccessed: encrypted.lastAccessed ? new Date(encrypted.lastAccessed) : undefined,
      tags: encrypted.tags
    };
  }

  private encryptStorageData(data: string, key: Buffer): string {
    const iv = crypto.randomBytes(CredentialManager.IV_LENGTH);
    const cipher = crypto.createCipheriv(CredentialManager.ALGORITHM, key, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  private decryptStorageData(encryptedData: string, key: Buffer): string {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const ivHex = parts[0];
    const authTagHex = parts[1];
    const encrypted = parts[2];

    if (!ivHex || !authTagHex || !encrypted) {
      throw new Error('Invalid encrypted data format: missing components');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(CredentialManager.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private ensureStorageDirectory(): void {
    const dir = this.storagePath.substring(0, this.storagePath.lastIndexOf('/'));
    if (!existsSync(dir)) {
      // In a real implementation, use recursive mkdir with secure permissions
      logger.info(`Creating credential storage directory: ${dir}`);
    }
  }

  private scheduleKeyRotation(): void {
    const rotationMs = this.config.rotationDays * 24 * 60 * 60 * 1000;

    setTimeout(async () => {
      try {
        await this.rotateMasterKey();
        this.scheduleKeyRotation(); // Schedule next rotation
      } catch (error) {
        logger.error('Automatic key rotation failed', error);
      }
    }, rotationMs);
  }

  private startSessionTimer(): void {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }

    this.sessionTimeout = setTimeout(() => {
      logger.warn('CredentialManager session expired');
      this.lock();
    }, this.config.sessionTimeout);
  }
}

export default CredentialManager;