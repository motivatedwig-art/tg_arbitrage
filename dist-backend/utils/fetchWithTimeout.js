export async function fetchWithTimeout(promise, timeoutMs = 9000 // 9 seconds for Vercel
) {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs));
    return Promise.race([promise, timeout]);
}
// Note: This function is not used in the current implementation
// and references ExchangeFactory which doesn't exist
// export async function fetchAllExchanges(exchanges: string[]): Promise<any[]> {
//   const fetchPromises = exchanges.map(async (exchange) => {
//     try {
//       const adapter = ExchangeFactory.create(exchange);
//       return await fetchWithTimeout(adapter.fetchTickers(), 8000);
//     } catch (error) {
//       console.error(`Failed to fetch ${exchange}:`, error.message);
//       return null; // Return null for failed exchanges
//     }
//   });
//   
//   const results = await Promise.allSettled(fetchPromises);
//   return results
//     .filter(r => r.status === 'fulfilled' && r.value !== null)
//     .map(r => (r as PromiseFulfilledResult<any>).value);
// }
//# sourceMappingURL=fetchWithTimeout.js.map