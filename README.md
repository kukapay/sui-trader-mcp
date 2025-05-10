# Sui Trader MCP

An MCP server designed for AI agents to perform optimal token swaps on the Sui blockchain.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)
![Status](https://img.shields.io/badge/status-active-brightgreen.svg)

## Features

- **Token Swaps**: Execute token swaps on Sui mainnet via the Cetus Aggregator.
- **Bech32 Private Key Support**: Securely load a Sui private key (starting with `suiprivkey`) from environment variables.

## Prerequisites

- **Node.js**: Version 18.x or higher.
- **npm**: For dependency management.
- **Sui Wallet**: A Sui private key in bech32 format (starts with `suiprivkey`).

## Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/kukapay/sui-trader-mcp.git
   cd sui-trader-mcp
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure MCP Client**:
    ```json
    {
      "mcpServers": {
        "sui-trader": {
          "command": "node",
          "args": ["/absolute/path/to/sui-trader-mcp/index.js"],
          "env": { "PRIVATE_KEY": "your_private_key" }
          }
        }
      }
    }
    ```
    Replace `/absolute/path/to/sui-trader-mcp/` with the actual installation path, and `your_private_key` with your Bech32-formatted private key..
    
## Usage

Use an MCP-compatible client to invoke the `swap` tool. 

### Example

Prompt:
```
Swap 1.5 SUI to USDC with 2% slippage, using a fixed input amount.
```

Output:
```
Transaction ID: zjGekhLBfMYzGqu57fTeu3K1NX5jC5wNUy8rpdPcLyv. Status: success
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

