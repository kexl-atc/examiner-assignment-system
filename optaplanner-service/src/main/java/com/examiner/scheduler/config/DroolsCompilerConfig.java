package com.examiner.scheduler.config;

import io.quarkus.runtime.Startup;
import org.jboss.logging.Logger;

import javax.annotation.PostConstruct;
import javax.enterprise.context.ApplicationScoped;

/**
 * Drools编译器配置
 * 强制使用ECJ编译器以支持JRE环境（无JDK）
 */
@ApplicationScoped
@Startup
public class DroolsCompilerConfig {
    
    private static final Logger LOGGER = Logger.getLogger(DroolsCompilerConfig.class);
    
    @PostConstruct
    public void init() {
        LOGGER.info("🔧 初始化Drools编译器配置...");
        
        // 强制Drools使用ECJ编译器
        System.setProperty("drools.dialect.java.compiler", "ECLIPSE");
        System.setProperty("drools.dialect.java.compiler.lnglevel", "17");
        
        // 禁用JDK编译器查找
        System.setProperty("drools.dialect.java.strict", "false");
        
        LOGGER.info("✅ Drools已配置为使用ECJ (Eclipse Compiler for Java)");
        LOGGER.info("   - 编译器: ECLIPSE");
        LOGGER.info("   - 语言级别: Java 17");
        LOGGER.info("   - 这使应用可以在JRE环境下运行（无需JDK）");
    }
}

