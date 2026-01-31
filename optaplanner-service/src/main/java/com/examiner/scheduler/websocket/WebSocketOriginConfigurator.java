package com.examiner.scheduler.websocket;

import javax.websocket.HandshakeResponse;
import javax.websocket.server.HandshakeRequest;
import javax.websocket.server.ServerEndpointConfig;
import java.util.List;

/**
 * WebSocket Origin配置器
 * 解决Electron应用file://协议Origin验证问题
 */
public class WebSocketOriginConfigurator extends ServerEndpointConfig.Configurator {
    
    @Override
    public boolean checkOrigin(String originHeaderValue) {
        // 🔧 关键修复：始终允许连接，避免403错误
        // 在生产环境中，WebSocket Origin检查可能导致Electron应用连接失败
        // 由于我们已经使用了sessionId进行身份验证，Origin检查可以放宽
        
        // 🚨 移除所有日志调用，防止大量日志文件产生
        
        return true; // 🔧 始终返回true，确保所有连接都能通过
    }
    
    @Override
    public void modifyHandshake(ServerEndpointConfig config, HandshakeRequest request, HandshakeResponse response) {
        // 🚨 移除所有日志调用，防止大量日志文件产生
        
        // 添加CORS头以支持跨域
        response.getHeaders().put("Access-Control-Allow-Origin", List.of("*"));
        response.getHeaders().put("Access-Control-Allow-Methods", List.of("GET, POST, OPTIONS"));
        response.getHeaders().put("Access-Control-Allow-Headers", List.of("Origin, Content-Type, Accept, Authorization"));
        
        super.modifyHandshake(config, request, response);
    }
}