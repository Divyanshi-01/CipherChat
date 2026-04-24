package com.p2p.messaging.common.crypto;

import org.bouncycastle.jce.provider.BouncyCastleProvider;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.*;
import java.security.spec.X509EncodedKeySpec;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Base64;

/**
 * Cryptographic utilities for P2P messaging
 * Handles AES/GCM encryption, RSA key generation, and key exchange
 */
public class CryptoUtil {

    static {
        if (Security.getProvider("BC") == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
    }

    // ============ CONSTANTS ============
    private static final String AES_ALGORITHM = "AES/GCM/NoPadding";
    private static final String RSA_ALGORITHM = "RSA/ECB/PKCS1Padding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;
    private static final int AES_KEY_SIZE = 256;
    private static final int RSA_KEY_SIZE = 2048;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    // ============ AES KEY GENERATION ============

    /**
     * Generate a secure random AES key (256-bit)
     */
    public static SecretKey generateAESKey() throws Exception {
        KeyGenerator keyGen = KeyGenerator.getInstance("AES");
        keyGen.init(AES_KEY_SIZE, SECURE_RANDOM);
        return keyGen.generateKey();
    }

    // ============ RSA KEY GENERATION ============

    /**
     * Generate RSA Key Pair (2048-bit)
     */
    public static KeyPair generateRSAKeyPair() throws Exception {
        KeyPairGenerator keyGen = KeyPairGenerator.getInstance("RSA", "BC");
        keyGen.initialize(RSA_KEY_SIZE, SECURE_RANDOM);
        return keyGen.generateKeyPair();
    }

    // ============ AES ENCRYPTION/DECRYPTION ============

    /**
     * Encrypt message using AES/GCM
     * Format: [IV (12 bytes) | Ciphertext | Authentication Tag (16 bytes)]
     */
    public static String encrypt(String message, SecretKey key) throws Exception {
        if (message == null || message.isEmpty()) {
            throw new IllegalArgumentException("Message cannot be null or empty");
        }

        Cipher cipher = Cipher.getInstance(AES_ALGORITHM);

        byte[] iv = new byte[GCM_IV_LENGTH];
        SECURE_RANDOM.nextBytes(iv);

        GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
        cipher.init(Cipher.ENCRYPT_MODE, key, gcmSpec);

        byte[] encryptedData = cipher.doFinal(message.getBytes());

        ByteBuffer buffer = ByteBuffer.allocate(iv.length + encryptedData.length);
        buffer.put(iv);
        buffer.put(encryptedData);

        return Base64.getEncoder().encodeToString(buffer.array());
    }

    /**
     * Decrypt message using AES/GCM
     */
    public static String decrypt(String encryptedData, SecretKey key) throws Exception {
        if (encryptedData == null || encryptedData.isEmpty()) {
            throw new IllegalArgumentException("Encrypted data cannot be null or empty");
        }

        byte[] decodedData = Base64.getDecoder().decode(encryptedData);

        if (decodedData.length < GCM_IV_LENGTH + 16) {
            throw new IllegalArgumentException("Invalid encrypted data: insufficient length");
        }

        ByteBuffer buffer = ByteBuffer.wrap(decodedData);
        byte[] iv = new byte[GCM_IV_LENGTH];
        buffer.get(iv);

        byte[] ciphertext = new byte[buffer.remaining()];
        buffer.get(ciphertext);

        Cipher cipher = Cipher.getInstance(AES_ALGORITHM);
        GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);

        cipher.init(Cipher.DECRYPT_MODE, key, gcmSpec);
        byte[] decryptedData = cipher.doFinal(ciphertext);

        return new String(decryptedData);
    }

    // ============ RSA ENCRYPTION/DECRYPTION ============

    /**
     * Encrypt data using RSA public key
     */
    public static String encryptWithPublicKey(String data, PublicKey publicKey) throws Exception {
        if (data == null || data.isEmpty()) {
            throw new IllegalArgumentException("Data cannot be null or empty");
        }

        Cipher cipher = Cipher.getInstance(RSA_ALGORITHM, "BC");
        cipher.init(Cipher.ENCRYPT_MODE, publicKey, SECURE_RANDOM);
        byte[] encryptedData = cipher.doFinal(data.getBytes());
        return Base64.getEncoder().encodeToString(encryptedData);
    }

    /**
     * Decrypt data using RSA private key
     */
    public static String decryptWithPrivateKey(String encryptedData, PrivateKey privateKey) throws Exception {
        if (encryptedData == null || encryptedData.isEmpty()) {
            throw new IllegalArgumentException("Encrypted data cannot be null or empty");
        }

        byte[] decodedData = Base64.getDecoder().decode(encryptedData);
        Cipher cipher = Cipher.getInstance(RSA_ALGORITHM, "BC");
        cipher.init(Cipher.DECRYPT_MODE, privateKey);
        byte[] decryptedData = cipher.doFinal(decodedData);
        return new String(decryptedData);
    }

    // ============ KEY SERIALIZATION ============

    /**
     * Convert SecretKey to Base64 string
     */
    public static String keyToString(SecretKey key) {
        return Base64.getEncoder().encodeToString(key.getEncoded());
    }

    /**
     * Convert Base64 string back to SecretKey
     */
    public static SecretKey stringToKey(String encodedKey) {
        byte[] decodedKey = Base64.getDecoder().decode(encodedKey);
        return new SecretKeySpec(decodedKey, 0, decodedKey.length, "AES");
    }

    /**
     * Convert PublicKey to Base64 string
     */
    public static String publicKeyToString(PublicKey publicKey) {
        return Base64.getEncoder().encodeToString(publicKey.getEncoded());
    }

    /**
     * Convert Base64 string back to PublicKey
     */
    public static PublicKey stringToPublicKey(String encodedKey) throws Exception {
        byte[] decodedKey = Base64.getDecoder().decode(encodedKey);
        X509EncodedKeySpec spec = new X509EncodedKeySpec(decodedKey);
        KeyFactory keyFactory = KeyFactory.getInstance("RSA", "BC");
        return keyFactory.generatePublic(spec);
    }

    /**
     * Convert PrivateKey to Base64 string
     */
    public static String privateKeyToString(PrivateKey privateKey) {
        return Base64.getEncoder().encodeToString(privateKey.getEncoded());
    }

    /**
     * Convert Base64 string back to PrivateKey
     */
    public static PrivateKey stringToPrivateKey(String encodedKey) throws Exception {
        byte[] decodedKey = Base64.getDecoder().decode(encodedKey);
        PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(decodedKey);
        KeyFactory keyFactory = KeyFactory.getInstance("RSA", "BC");
        return keyFactory.generatePrivate(spec);
    }

    /**
     * Generate random hex string
     */
    public static String generateRandomHex(int length) {
        byte[] bytes = new byte[length];
        SECURE_RANDOM.nextBytes(bytes);
        return bytesToHex(bytes);
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder hexString = new StringBuilder();
        for (byte b : bytes) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) {
                hexString.append('0');
            }
            hexString.append(hex);
        }
        return hexString.toString();
    }
}