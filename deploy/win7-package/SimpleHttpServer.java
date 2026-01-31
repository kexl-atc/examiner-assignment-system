import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;
import java.net.InetSocketAddress;
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.*;
import java.nio.file.*;

public class SimpleHttpServer {
    private static final int BACKEND_PORT = 8082;
    
    public static void main(String[] args) throws Exception {
        int port = 8081;
        String rootDir = "supervisor/frontend/dist";
        
        if (args.length > 0) port = Integer.parseInt(args[0]);
        if (args.length > 1) rootDir = args[1];
        
        final String root = rootDir;
        HttpServer server = HttpServer.create(new InetSocketAddress("0.0.0.0", port), 0);
        
        // API Proxy: Forward /api/* requests to backend
        server.createContext("/api", exchange -> {
            try {
                // Handle OPTIONS preflight requests
                if (exchange.getRequestMethod().equals("OPTIONS")) {
                    exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
                    exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
                    exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "*");
                    exchange.getResponseHeaders().set("Access-Control-Max-Age", "3600");
                    exchange.sendResponseHeaders(200, 0);
                    exchange.close();
                    return;
                }
                
                String path = exchange.getRequestURI().getPath();
                String query = exchange.getRequestURI().getQuery();
                String fullPath = path + (query != null ? "?" + query : "");
                
                System.out.println("[API Proxy] " + exchange.getRequestMethod() + " " + fullPath);
                
                // Build backend URL
                URL backendUrl = new URL("http://127.0.0.1:" + BACKEND_PORT + fullPath);
                System.out.println("[API Proxy] Forwarding to: " + backendUrl);
                HttpURLConnection conn = (HttpURLConnection) backendUrl.openConnection();
                
                // Set request method
                conn.setRequestMethod(exchange.getRequestMethod());
                
                // Copy request headers
                exchange.getRequestHeaders().forEach((key, values) -> {
                    if (!key.equalsIgnoreCase("Host") && !key.equalsIgnoreCase("Connection")) {
                        values.forEach(value -> conn.setRequestProperty(key, value));
                    }
                });
                
                // Copy request body (if any)
                if (exchange.getRequestMethod().equals("POST") || 
                    exchange.getRequestMethod().equals("PUT") || 
                    exchange.getRequestMethod().equals("PATCH")) {
                    conn.setDoOutput(true);
                    // Ensure Content-Type is set for POST requests
                    String contentType = exchange.getRequestHeaders().getFirst("Content-Type");
                    if (contentType == null || contentType.isEmpty()) {
                        contentType = "application/json";
                    }
                    conn.setRequestProperty("Content-Type", contentType);
                    
                    // Read request body and log size
                    ByteArrayOutputStream requestBodyBuffer = new ByteArrayOutputStream();
                    try (InputStream is = exchange.getRequestBody()) {
                        byte[] buffer = new byte[8192];
                        int bytesRead;
                        while ((bytesRead = is.read(buffer)) != -1) {
                            requestBodyBuffer.write(buffer, 0, bytesRead);
                        }
                    }
                    byte[] requestBody = requestBodyBuffer.toByteArray();
                    System.out.println("[API Proxy] Request body size: " + requestBody.length + " bytes");
                    
                    // Write request body to backend
                    try (OutputStream os = conn.getOutputStream()) {
                        os.write(requestBody);
                        os.flush();
                    }
                }
                
                // Get response
                int responseCode = conn.getResponseCode();
                System.out.println("[API Proxy] Response code: " + responseCode);
                
                // Log error response body for debugging
                if (responseCode >= 400) {
                    try {
                        InputStream errorStream = conn.getErrorStream();
                        if (errorStream != null) {
                            ByteArrayOutputStream errorBuffer = new ByteArrayOutputStream();
                            byte[] buffer = new byte[1024];
                            int bytesRead;
                            while ((bytesRead = errorStream.read(buffer)) != -1) {
                                errorBuffer.write(buffer, 0, bytesRead);
                            }
                            String errorBody = errorBuffer.toString("UTF-8");
                            System.err.println("[API Proxy Error] Response body: " + errorBody.substring(0, Math.min(500, errorBody.length())));
                        }
                    } catch (Exception e) {
                        System.err.println("[API Proxy Error] Failed to read error response: " + e.getMessage());
                    }
                }
                exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
                exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
                exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "*");
                
                // Copy response headers
                conn.getHeaderFields().forEach((key, values) -> {
                    if (key != null && !key.equalsIgnoreCase("Transfer-Encoding")) {
                        values.forEach(value -> exchange.getResponseHeaders().add(key, value));
                    }
                });
                
                // Copy response body
                InputStream responseStream = responseCode >= 200 && responseCode < 300 
                    ? conn.getInputStream() 
                    : conn.getErrorStream();
                
                if (responseStream != null) {
                    ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                    byte[] data = new byte[8192];
                    int bytesRead;
                    while ((bytesRead = responseStream.read(data)) != -1) {
                        buffer.write(data, 0, bytesRead);
                    }
                    byte[] responseData = buffer.toByteArray();
                    exchange.sendResponseHeaders(responseCode, responseData.length);
                    exchange.getResponseBody().write(responseData);
                } else {
                    exchange.sendResponseHeaders(responseCode, 0);
                }
                
                conn.disconnect();
            } catch (Exception e) {
                System.err.println("[API Proxy Error] " + e.getMessage());
                System.err.println("[API Proxy Error] Path: " + exchange.getRequestURI().getPath());
                e.printStackTrace();
                String errorMsg = "{\"error\":\"Backend connection failed: " + e.getMessage() + "\"}";
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(502, errorMsg.length());
                exchange.getResponseBody().write(errorMsg.getBytes());
            } finally {
                exchange.close();
            }
        });
        
        // Static file service
        server.createContext("/", exchange -> {
            String path = exchange.getRequestURI().getPath();
            if (path.equals("/")) path = "/index.html";
            
            // Skip API requests (should be handled by /api handler)
            if (path.startsWith("/api")) {
                exchange.sendResponseHeaders(404, 0);
                exchange.close();
                return;
            }
            
            File file = new File(root + path);
            if (file.exists() && file.isFile()) {
                byte[] data = Files.readAllBytes(file.toPath());
                String contentType = getContentType(path);
                exchange.getResponseHeaders().set("Content-Type", contentType);
                exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
                exchange.sendResponseHeaders(200, data.length);
                exchange.getResponseBody().write(data);
            } else {
                // Try index.html for SPA routing
                File index = new File(root + "/index.html");
                if (index.exists()) {
                    byte[] data = Files.readAllBytes(index.toPath());
                    exchange.getResponseHeaders().set("Content-Type", "text/html");
                    exchange.sendResponseHeaders(200, data.length);
                    exchange.getResponseBody().write(data);
                } else {
                    String msg = "404 Not Found";
                    exchange.sendResponseHeaders(404, msg.length());
                    exchange.getResponseBody().write(msg.getBytes());
                }
            }
            exchange.close();
        });
        
        server.setExecutor(null);
        server.start();
        System.out.println("========================================");
        System.out.println("  Frontend HTTP Server Started");
        System.out.println("========================================");
        System.out.println("Port: " + port);
        System.out.println("Root: " + root);
        System.out.println("URL:  http://127.0.0.1:" + port);
        System.out.println("========================================");
        System.out.println("Press Ctrl+C to stop");
    }
    
    static String getContentType(String path) {
        path = path.toLowerCase();
        if (path.endsWith(".html")) return "text/html; charset=utf-8";
        if (path.endsWith(".js")) return "application/javascript; charset=utf-8";
        if (path.endsWith(".css")) return "text/css; charset=utf-8";
        if (path.endsWith(".json")) return "application/json; charset=utf-8";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
        if (path.endsWith(".gif")) return "image/gif";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".ico")) return "image/x-icon";
        if (path.endsWith(".woff")) return "font/woff";
        if (path.endsWith(".woff2")) return "font/woff2";
        if (path.endsWith(".ttf")) return "font/ttf";
        return "application/octet-stream";
    }
}

