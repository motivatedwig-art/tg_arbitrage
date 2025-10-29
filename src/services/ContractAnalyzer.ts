/**
 * Contract Address Analyzer
 * Detects blockchain from contract address format
 */

export class ContractAnalyzer {
  /**
   * Detect blockchain from contract address format
   */
  detectBlockchainFromAddress(address: string): string | null {
    if (!address || address.length === 0) {
      return null;
    }

    const normalized = address.trim();

    // Ethereum-compatible (0x prefixed, 40 hex chars)
    // Could be ETH, BSC, Polygon, Arbitrum, Optimism, Base, etc.
    if (/^0x[a-fA-F0-9]{40}$/.test(normalized)) {
      // Ambiguous - needs additional context or checksum validation
      // Will return null and let context determine
      return null;
    }
    
    // Ethereum-compatible with checksum (EIP-55)
    if (/^0x[a-fA-F0-9]{40}$/.test(normalized) && this.isValidEIP55Checksum(normalized)) {
      // Still ambiguous but confirmed Ethereum format
      return null;
    }
    
    // Solana (base58, 32-44 chars, no 0, O, I, l)
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(normalized)) {
      return 'solana';
    }
    
    // Tron (base58, starts with T, exactly 34 chars)
    if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(normalized)) {
      return 'tron';
    }

    // Bitcoin addresses (various formats)
    if (this.isBitcoinAddress(normalized)) {
      return 'bitcoin';
    }

    // Ripple (starts with r, base58)
    if (/^r[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(normalized)) {
      return 'ripple';
    }

    // Stellar (starts with G, base58, 56 chars)
    if (/^G[1-9A-HJ-NP-Za-km-z]{55}$/.test(normalized)) {
      return 'stellar';
    }

    return null;
  }

  /**
   * Detect EVM-compatible chain from address (requires additional context)
   * This attempts to determine if 0x address is ETH, BSC, Polygon, etc.
   */
  private detectEVMChain(address: string, context?: {
    exchange?: string;
    symbol?: string;
    networkHints?: string[];
  }): string {
    // If we have network hints from exchange, use them
    if (context?.networkHints && context.networkHints.length > 0) {
      // Prefer hints in order
      return this.mapNetworkToBlockchain(context.networkHints[0]);
    }

    // Default to ethereum if ambiguous
    return 'ethereum';
  }

  /**
   * Map network code to blockchain
   */
  private mapNetworkToBlockchain(network: string): string {
    const mapping: { [key: string]: string } = {
      'ETH': 'ethereum',
      'ERC20': 'ethereum',
      'BSC': 'bsc',
      'BEP20': 'bsc',
      'POLYGON': 'polygon',
      'MATIC': 'polygon',
      'AVAX': 'avalanche',
      'ARB': 'arbitrum',
      'OP': 'optimism',
      'BASE': 'base',
    };

    return mapping[network.toUpperCase()] || 'ethereum';
  }

  /**
   * Validate EIP-55 checksum for Ethereum addresses
   */
  private isValidEIP55Checksum(address: string): boolean {
    // Simplified check - full implementation would verify checksum
    // For now, just check if it has mixed case (likely checksummed)
    return /^0x[a-fA-F0-9]+$/.test(address) && 
           (address !== address.toLowerCase() && address !== address.toUpperCase());
  }

  /**
   * Check if address is a Bitcoin address (multiple formats)
   */
  private isBitcoinAddress(address: string): boolean {
    // Legacy P2PKH (starts with 1, base58)
    if (/^[13][1-9A-HJ-NP-Za-km-z]{25,34}$/.test(address)) {
      return true;
    }

    // P2SH (starts with 3, base58)
    if (/^3[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(address)) {
      return true;
    }

    // Bech32 (starts with bc1, all lowercase/numbers)
    if (/^bc1[a-z0-9]{39,59}$/.test(address)) {
      return true;
    }

    // Bech32m (starts with bc1p)
    if (/^bc1p[a-z0-9]{58}$/.test(address)) {
      return true;
    }

    return false;
  }

  /**
   * Verify contract exists on blockchain by querying (if RPC available)
   * This is a placeholder - full implementation would query blockchain RPCs
   */
  async verifyContractOnChain(
    address: string,
    blockchain: string
  ): Promise<boolean> {
    // TODO: Implement actual blockchain queries
    // For now, return true if format matches
    const detected = this.detectBlockchainFromAddress(address);
    return detected === blockchain;
  }

  /**
   * Get blockchain from contract with context
   */
  getBlockchainFromContract(
    address: string,
    context?: {
      exchange?: string;
      symbol?: string;
      networkHints?: string[];
    }
  ): string {
    // Try format detection first
    const detected = this.detectBlockchainFromAddress(address);
    if (detected) {
      return detected;
    }

    // For EVM chains, use context or default
    if (this.isEVMAddress(address)) {
      return this.detectEVMChain(address, context);
    }

    // Unknown format
    return 'ethereum'; // Default fallback
  }

  /**
   * Check if address is EVM-compatible (0x format)
   */
  private isEVMAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}

