/**
 * Error tipado para el dispatcher MCP. `code` es un código JSON-RPC
 * (ver https://www.jsonrpc.org/specification#error_object):
 *   -32700 parse, -32600 invalid request, -32601 method not found,
 *   -32602 invalid params, -32603 internal error.
 */
export class McpError extends Error {
  code: number;
  data?: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = "McpError";
    this.code = code;
    this.data = data;
  }
}
