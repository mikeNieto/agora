import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type StoredSecrets = {
	githubToken?: string;
	openrouterApiKey?: string;
	deepseekApiKey?: string;
};

type EncryptedRecord = {
	encrypted: {
		iv: string;
		tag: string;
		ciphertext: string;
	};
	updatedAt: string;
};

type SecretStore = Record<string, EncryptedRecord>;

const STORAGE_DIR = process.env.AGORA_STORAGE_DIR?.trim()
	? path.resolve(process.env.AGORA_STORAGE_DIR)
	: path.join(process.cwd(), ".agora");
const KEY_PATH = path.join(STORAGE_DIR, "provider-secrets.key");
const STORE_PATH = path.join(STORAGE_DIR, "provider-secrets.json");

export async function readProviderSecrets(
	sessionId: string,
): Promise<StoredSecrets> {
	const store = await readSecretStore();
	const record = store[sessionId];

	if (!record) {
		return {};
	}

	return decryptSecrets(record.encrypted);
}

export async function writeProviderSecrets(
	sessionId: string,
	secrets: StoredSecrets,
): Promise<void> {
	const store = await readSecretStore();

	if (Object.keys(secrets).length === 0) {
		delete store[sessionId];
		await persistSecretStore(store);
		return;
	}

	store[sessionId] = {
		encrypted: await encryptSecrets(secrets),
		updatedAt: new Date().toISOString(),
	};

	await persistSecretStore(store);
}

async function readSecretStore(): Promise<SecretStore> {
	try {
		const raw = await readFile(STORE_PATH, "utf8");
		const parsed = JSON.parse(raw) as SecretStore;
		return parsed ?? {};
	} catch {
		return {};
	}
}

async function persistSecretStore(store: SecretStore): Promise<void> {
	await mkdir(STORAGE_DIR, { recursive: true });
	await writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, {
		mode: 0o600,
	});
}

async function encryptSecrets(secrets: StoredSecrets) {
	const key = await getEncryptionKey();
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", key, iv);
	const plaintext = Buffer.from(JSON.stringify(secrets), "utf8");
	const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
	const tag = cipher.getAuthTag();

	return {
		iv: iv.toString("base64"),
		tag: tag.toString("base64"),
		ciphertext: ciphertext.toString("base64"),
	};
}

async function decryptSecrets(record: EncryptedRecord["encrypted"]) {
	const key = await getEncryptionKey();
	const decipher = createDecipheriv(
		"aes-256-gcm",
		key,
		Buffer.from(record.iv, "base64"),
	);

	decipher.setAuthTag(Buffer.from(record.tag, "base64"));

	const plaintext = Buffer.concat([
		decipher.update(Buffer.from(record.ciphertext, "base64")),
		decipher.final(),
	]);

	return JSON.parse(plaintext.toString("utf8")) as StoredSecrets;
}

async function getEncryptionKey(): Promise<Buffer> {
	const configuredKey = process.env.AGORA_PROVIDER_SETTINGS_KEY;

	if (configuredKey) {
		return createHash("sha256").update(configuredKey).digest();
	}

	await mkdir(STORAGE_DIR, { recursive: true });

	try {
		const rawKey = await readFile(KEY_PATH, "utf8");
		return Buffer.from(rawKey.trim(), "base64");
	} catch {
		const generatedKey = randomBytes(32);
		await writeFile(KEY_PATH, generatedKey.toString("base64"), {
			mode: 0o600,
		});
		return generatedKey;
	}
}
