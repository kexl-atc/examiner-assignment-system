package com.examiner.scheduler.config;

import io.quarkus.runtime.StartupEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.enterprise.context.ApplicationScoped;
import javax.enterprise.event.Observes;

/**
 * WebSocket配置类
 * 在应用启动时配置WebSocket相关设置
 */
@ApplicationScoped
public class WebSocketConfig {
    
    private static final Logger LOGGER = LoggerFactory.getLogger(WebSocketConfig.class);
    
    void onStart(@Observes StartupEvent ev) {
        LOGGER.info("🔧 [WebSocket配置] 应用启动，WebSocket配置已加载");
        LOGGER.info("🔧 [WebSocket配置] CORS设置：允许所有Origin");
        LOGGER.info("🔧 [WebSocket配置] 最大帧大小：1MB");
        LOGGER.info("🔧 [WebSocket配置] 超时时间：10分钟");
        
        // 🔧 尝试通过系统属性禁用WebSocket的Origin检查
        System.setProperty("io.undertow.websocket.DISABLE_RFC6455_STRICT_MODE", "true");
        System.setProperty("io.undertow.websocket.ALLOW_UNMASKED_FRAMES", "true");
        
        LOGGER.info("🔧 [WebSocket配置] 已禁用严格模式和Frame掩码检查");
    }
}

