/*
 * SignalForge WebAssembly Engine
 * Pure C implementation of bit-level communication algorithms.
 * No libc, no malloc, no stdio, no stdlib.
 * Concepts: XOR Stream Cipher, CRC-8 (x^8 + x^2 + x + 1), Hamming(7,4) FEC
 */

#define BUFFER_SIZE (1 << 17) // 131,072 bytes

static unsigned char IN[BUFFER_SIZE];
static unsigned char OUT[BUFFER_SIZE];
static unsigned char AUX[BUFFER_SIZE];

// Buffer pointer getters
unsigned char* get_in_ptr(void) {
    return IN;
}

unsigned char* get_out_ptr(void) {
    return OUT;
}

unsigned char* get_aux_ptr(void) {
    return AUX;
}

int engine_version(void) {
    return 100; // v1.0.0
}

/*
 * XOR Stream Cipher (Educational)
 * IN contains input bytes, AUX contains key bytes.
 * Writes scrambled bytes to OUT.
 */
int xor_cipher(int len, int key_len) {
    if (len <= 0 || key_len <= 0) return 0;
    for (int i = 0; i < len; i++) {
        OUT[i] = IN[i] ^ AUX[i % key_len];
    }
    return len;
}

/*
 * CRC-8 Checksum
 * Polynomial: 0x07 (x^8 + x^2 + x + 1)
 * Initial value: 0x00, no reflection.
 * Computed over IN (length len bytes).
 * Returns the CRC-8 byte as an integer (0..255).
 */
int crc8(int len) {
    unsigned char crc = 0x00;
    for (int i = 0; i < len; i++) {
        crc ^= IN[i];
        for (int j = 0; j < 8; j++) {
            if (crc & 0x80) {
                crc = (crc << 1) ^ 0x07;
            } else {
                crc = crc << 1;
            }
        }
    }
    return (int)crc;
}

/*
 * Hamming(7,4) Systematic Forward Error Correction Encoding
 * Codeword format: [p1, p2, d1, p3, d2, d3, d4]
 * p1 = d1 ^ d2 ^ d4
 * p2 = d1 ^ d3 ^ d4
 * p3 = d2 ^ d3 ^ d4
 *
 * Input: IN contains n_bits (values 0 or 1).
 * Output: OUT contains coded bits (each 0 or 1).
 * Padded with zeros to a multiple of 4 if needed.
 * Returns total number of coded bits written to OUT.
 */
int hamming74_encode(int n_bits) {
    if (n_bits <= 0) return 0;
    int n_blocks = (n_bits + 3) / 4;
    for (int b = 0; b < n_blocks; b++) {
        int idx = b * 4;
        unsigned char d1 = (idx < n_bits)     ? (IN[idx] & 1)     : 0;
        unsigned char d2 = (idx + 1 < n_bits) ? (IN[idx + 1] & 1) : 0;
        unsigned char d3 = (idx + 2 < n_bits) ? (IN[idx + 2] & 1) : 0;
        unsigned char d4 = (idx + 3 < n_bits) ? (IN[idx + 3] & 1) : 0;

        unsigned char p1 = d1 ^ d2 ^ d4;
        unsigned char p2 = d1 ^ d3 ^ d4;
        unsigned char p3 = d2 ^ d3 ^ d4;

        int out_idx = b * 7;
        OUT[out_idx + 0] = p1;
        OUT[out_idx + 1] = p2;
        OUT[out_idx + 2] = d1;
        OUT[out_idx + 3] = p3;
        OUT[out_idx + 4] = d2;
        OUT[out_idx + 5] = d3;
        OUT[out_idx + 6] = d4;
    }
    return n_blocks * 7;
}

/*
 * Hamming(7,4) Systematic FEC Decoding & Single-Bit Error Correction
 * Syndrome s = s1 + 2*s2 + 4*s3
 * s1 = p1 ^ d1 ^ d2 ^ d4
 * s2 = p2 ^ d1 ^ d3 ^ d4
 * s3 = p3 ^ d2 ^ d3 ^ d4
 *
 * Input: IN contains n_blocks * 7 coded bits (values 0 or 1).
 * Output: OUT receives n_blocks * 4 decoded data bits.
 * AUX receives 1-based bit index of corrected bits (up to n_blocks entries).
 * Returns number of corrected blocks.
 */
int hamming74_decode(int n_blocks) {
    if (n_blocks <= 0) return 0;
    int corrected_count = 0;

    for (int b = 0; b < n_blocks; b++) {
        int in_idx = b * 7;
        unsigned char r1 = IN[in_idx + 0] & 1; // p1
        unsigned char r2 = IN[in_idx + 1] & 1; // p2
        unsigned char r3 = IN[in_idx + 2] & 1; // d1
        unsigned char r4 = IN[in_idx + 3] & 1; // p3
        unsigned char r5 = IN[in_idx + 4] & 1; // d2
        unsigned char r6 = IN[in_idx + 5] & 1; // d3
        unsigned char r7 = IN[in_idx + 6] & 1; // d4

        unsigned char s1 = r1 ^ r3 ^ r5 ^ r7;
        unsigned char s2 = r2 ^ r3 ^ r6 ^ r7;
        unsigned char s3 = r4 ^ r5 ^ r6 ^ r7;
        int s = s1 + (s2 << 1) + (s3 << 2); // syndrome: 0 if no error, 1..7 points to flipped bit

        if (s != 0) {
            // Flip the erroneous bit in local codeword
            if (s == 1) r1 ^= 1;
            else if (s == 2) r2 ^= 1;
            else if (s == 3) r3 ^= 1;
            else if (s == 4) r4 ^= 1;
            else if (s == 5) r5 ^= 1;
            else if (s == 6) r6 ^= 1;
            else if (s == 7) r7 ^= 1;

            AUX[corrected_count] = (unsigned char)s; // Syndrome / bit position within block (1-7)
            corrected_count++;
        }

        int out_idx = b * 4;
        OUT[out_idx + 0] = r3; // d1
        OUT[out_idx + 1] = r5; // d2
        OUT[out_idx + 2] = r6; // d3
        OUT[out_idx + 3] = r7; // d4
    }
    return corrected_count;
}

/*
 * Bit Error Counter
 * Compares IN and AUX for n_bits and returns total bit differences.
 */
int count_errors(int offset_a, int offset_b, int n_bits) {
    int errors = 0;
    for (int i = 0; i < n_bits; i++) {
        if ((IN[offset_a + i] & 1) != (AUX[offset_b + i] & 1)) {
            errors++;
        }
    }
    return errors;
}

/*
 * Binary to Decimal Converter (up to 31 bits unsigned)
 * Reads n_bits from IN (MSB first).
 * Returns integer value.
 */
int bin_to_dec(int n_bits) {
    if (n_bits <= 0 || n_bits > 31) return 0;
    int val = 0;
    for (int i = 0; i < n_bits; i++) {
        val = (val << 1) | (IN[i] & 1);
    }
    return val;
}

/*
 * Decimal to Binary Converter
 * Writes n_bits binary representation of val to OUT (MSB first).
 */
int dec_to_bin(unsigned int val, int n_bits) {
    if (n_bits <= 0 || n_bits > 32) return 0;
    for (int i = n_bits - 1; i >= 0; i--) {
        OUT[i] = (unsigned char)(val & 1);
        val >>= 1;
    }
    return n_bits;
}
