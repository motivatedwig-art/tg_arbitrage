/**
 * Contract Address Analyzer
 * Detects blockchain from contract address format
 */
export declare class ContractAnalyzer {
    /**
     * Detect blockchain from contract address format
     */
    detectBlockchainFromAddress(address: string): string | null;
    /**
     * Detect EVM-compatible chain from address (requires additional context)
     * This attempts to determine if 0x address is ETH, BSC, Polygon, etc.
     */
    private detectEVMChain;
    /**
     * Map network code to blockchain
     */
    private mapNetworkToBlockchain;
    /**
     * Validate EIP-55 checksum for Ethereum addresses
     */
    private isValidEIP55Checksum;
    /**
     * Check if address is a Bitcoin address (multiple formats)
     */
    private isBitcoinAddress;
    /**
     * Verify contract exists on blockchain by querying (if RPC available)
     * This is a placeholder - full implementation would query blockchain RPCs
     */
    verifyContractOnChain(address: string, blockchain: string): Promise<boolean>;
    /**
     * Get blockchain from contract with context
     */
    getBlockchainFromContract(address: string, context?: {
        exchange?: string;
        symbol?: string;
        networkHints?: string[];
    }): string;
    /**
     * Check if address is EVM-compatible (0x format)
     */
    private isEVMAddress;
}
//# sourceMappingURL=ContractAnalyzer.d.ts.map