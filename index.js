require("dotenv").config();
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { AggregatorClient } = require("@cetusprotocol/aggregator-sdk");
const { SuiClient, getFullnodeUrl } = require("@mysten/sui/client");
const { Ed25519Keypair } = require("@mysten/sui/keypairs/ed25519")
const { decodeSuiPrivateKey } = require("@mysten/sui/cryptography")
const { Transaction } = require("@mysten/sui/transactions")
const BN = require("bn.js");
const { z } = require("zod");


SUI_NETWORK = "mainnet"

// Initialize Sui client and keypair
const client = new SuiClient({ url: getFullnodeUrl(SUI_NETWORK) });

// Parse bech32 private key
const privateKey = process.env.PRIVATE_KEY;
if (!privateKey || !privateKey.startsWith("suiprivkey")) {
  throw new Error("Valid bech32 PRIVATE_KEY (starting with 'suiprivkey') not found in .env");
}
const {schema, secretKey} = decodeSuiPrivateKey(privateKey)
const keypair = Ed25519Keypair.fromSecretKey(secretKey);

// Initialize the Cetus Aggregator Client
const aggregatorClient = new AggregatorClient({client, signer: keypair.toSuiAddress()});

// Create MCP server
const server = new McpServer({
  name: "SuiTrader",
  version: "1.0.0",
});

// Hardcoded decimals for common tokens
const TOKEN_DECIMALS = {
  "0x2::sui::SUI": 9,
  "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS": 9,
  "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC": 6
};

// Function to fetch token decimals dynamically (if not hardcoded)
async function getTokenDecimals(tokenAddress) {
  if (TOKEN_DECIMALS[tokenAddress]) {
    return TOKEN_DECIMALS[tokenAddress];
  }
  try {
    const metadata = await client.getCoinMetadata({ coinType: tokenAddress });
    if (!metadata) {
      throw new Error(`No metadata found for token ${tokenAddress}`);
    }
    return metadata.decimals;
  } catch (error) {
    console.error(`Error fetching decimals for ${tokenAddress}: ${error.message}`);
    return 9; // Fallback to 9
  }
}

// Tool for executing a token swap
server.tool(
  "swap",
  "Executes a token swap on the Sui blockchain using the Cetus Aggregator",
  {
    from: z
      .string()
      .describe("Source token address")
      .default("0x2::sui::SUI"),
    target: z
      .string()
      .describe("Target token address")
      .default("0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC"), // USDC
    amount: z
      .number()
      .positive("Amount must be positive")
      .describe("Amount to swap (in human-readable format, e.g., 1.5 SUI)")
      .default(1.0),
    byAmountIn: z
      .boolean()
      .describe("True for fixed input, false for fixed output")
      .default(true),
    slippage: z
      .number()
      .min(0)
      .max(1)
      .describe("Slippage tolerance (e.g., 0.01 for 1%)")
      .default(0.01),
  },
  async({from, target, amount, byAmountIn, slippage}) => {
    try {
      // Fetch decimals for the source token
      const decimals = await getTokenDecimals(from);

      // Convert floating-point amount to smallest unit
      const amountInSmallestUnit = new BN(
        Math.floor(amount * Math.pow(10, decimals)).toString()
      );

      // Find best trading routes
      const routers = await aggregatorClient.findRouters({
        from,
        target,
        amount: amountInSmallestUnit,
        byAmountIn,
      });
      if (!routers || routers.routes.length === 0) {
        return {
          content: [{ type: "text", text: "No trading routes found" }],
          isError: true,
        };
      }

      // Create transaction
      const txb = new Transaction();

      // Execute fast swap
      await aggregatorClient.fastRouterSwap({
        routers,
        txb,
        slippage,
      });

      // Simulate transaction
      const simResult = await aggregatorClient.devInspectTransactionBlock(txb, keypair);

      if (simResult.effects.status.status !== "success") {
        return {
          content: [
            {
              type: "text",
              text: `Transaction simulation failed: ${JSON.stringify(simResult.effects.status)}`,
            },
          ],
          isError: true,
        };
      }

      // Sign and execute transaction
      const result = await aggregatorClient.signAndExecuteTransaction(txb, keypair);
      
      return {
        content: [
          {
            type: "text",
            text: `Transaction ID: ${result.digest}. Status: ${result.effects.status.status}`,
          },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error executing swap: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Start the server with stdio transport
async function startServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

startServer().catch(console.error);