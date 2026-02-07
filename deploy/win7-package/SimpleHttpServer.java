import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;
import java.io.*;
import java.net.*;
import java.nio.file.*;
import java.util.*;

public class SimpleHttpServer {
    private static String basePath;
    private static final int BACKEND_PORT = 8082;
    private static final String BACKEND_HOST = "127.0.0.1";
    
    public static void main(String[] args) throws IOException {
        if (args.length < 2) {
            System.out.println("Usage: java SimpleHttpServer <port> <basePath>");
            System.exit(1);
        }
        
        int port = Integer.parseInt(args[0]);
        basePath = args[1];
        
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        
        // API代理处理器 - 转发到后端
        server.createContext("/api", new ApiProxyHandler());
        server.createContext("/q", new ApiProxyHandler());  // Quarkus健康检查
        
        // 静态文件处理器
        server.createContext("/", new StaticFileHandler());
        
        server.setExecutor(null);
        
        System.out.println("================================");
        System.out.println("  HTTP Server Started");
        System.out.println("  Port: " + port);
        System.out.println("  Base: " + basePath);
        System.out.println("  API Proxy: http://" + BACKEND_HOST + ":" + BACKEND_PORT);
        System.out.println("================================");
        
        server.start();
    }
    
    // API代理处理器 - 将请求转发到后端
    static class ApiProxyHandler implements HttpHandler {
        public void handle(HttpExchange exchange) throws IOException {
            String path = exchange.getRequestURI().getPath();
            String query = exchange.getRequestURI().getQuery();
            String targetUrl = "http://" + BACKEND_HOST + ":" + BACKEND_PORT + path;
            if (query != null && !query.isEmpty()) {
                targetUrl += "?" + query;
            }
            
            String method = exchange.getRequestMethod();
            
            try {
                URL url = new URL(targetUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod(method);
                conn.setConnectTimeout(30000);
                conn.setReadTimeout(30000);
                conn.setDoInput(true);
                conn.setDoOutput(true);
                
                // 复制请求头
                Set<String> headers = exchange.getRequestHeaders().keySet();
                for (String header : headers) {
                    if (!header.equalsIgnoreCase("Host") && !header.equalsIgnoreCase("Content-Length")) {
                        List<String> values = exchange.getRequestHeaders().get(header);
                        for (String value : values) {
                            conn.addRequestProperty(header, value);
                        }
                    }
                }
                
                // 复制请求体
                if (method.equals("POST") || method.equals("PUT")) {
                    conn.setRequestProperty("Content-Type", exchange.getRequestHeaders().getFirst("Content-Type"));
                    try (OutputStream os = conn.getOutputStream()) {
                        byte[] body = exchange.getRequestBody().readAllBytes();
                        os.write(body);
                    }
                }
                
                // 获取响应
                int responseCode = conn.getResponseCode();
                String contentType = conn.getContentType();
                if (contentType == null) contentType = "application/json";
                
                // 复制响应头
                exchange.getResponseHeaders().set("Content-Type", contentType);
                exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
                
                // 读取响应体
                byte[] responseBody;
                try (InputStream is = (responseCode < 400) ? conn.getInputStream() : conn.getErrorStream()) {
                    if (is != null) {
                        responseBody = is.readAllBytes();
                    } else {
                        responseBody = new byte[0];
                    }
                }
                
                exchange.sendResponseHeaders(responseCode, responseBody.length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(responseBody);
                }
                
            } catch (Exception e) {
                System.err.println("Proxy error: " + e.getMessage());
                String errorJson = "{\"error\":\"Backend not available\",\"message\":\"" + e.getMessage() + "\"}";
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                byte[] bytes = errorJson.getBytes();
                exchange.sendResponseHeaders(503, bytes.length);
                exchange.getResponseBody().write(bytes);
                exchange.close();
            }
        }
    }
    
    // 静态文件处理器
    static class StaticFileHandler implements HttpHandler {
        public void handle(HttpExchange exchange) throws IOException {
            String path = exchange.getRequestURI().getPath();
            if (path.equals("/")) {
                path = "/index.html";
            }
            
            // Security: prevent directory traversal
            path = path.replace("..", "");
            
            File file = new File(basePath, path);
            
            if (!file.exists() || file.isDirectory()) {
                // Try index.html for SPA routes
                file = new File(basePath, "/index.html");
                if (!file.exists()) {
                    String response = "404 Not Found";
                    exchange.sendResponseHeaders(404, response.length());
                    exchange.getResponseBody().write(response.getBytes());
                    exchange.close();
                    return;
                }
            }
            
            String contentType = getContentType(file.getName());
            exchange.getResponseHeaders().set("Content-Type", contentType);
            
            byte[] content = Files.readAllBytes(file.toPath());
            exchange.sendResponseHeaders(200, content.length);
            exchange.getResponseBody().write(content);
            exchange.close();
        }
        
        private String getContentType(String filename) {
            if (filename.endsWith(".html")) return "text/html; charset=utf-8";
            if (filename.endsWith(".js")) return "application/javascript";
            if (filename.endsWith(".css")) return "text/css";
            if (filename.endsWith(".json")) return "application/json";
            if (filename.endsWith(".svg")) return "image/svg+xml";
            if (filename.endsWith(".png")) return "image/png";
            if (filename.endsWith(".ico")) return "image/x-icon";
            return "application/octet-stream";
        }
    }
}
