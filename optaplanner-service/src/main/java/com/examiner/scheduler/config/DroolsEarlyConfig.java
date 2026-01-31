package com.examiner.scheduler.config;

import io.quarkus.runtime.Quarkus;
import io.quarkus.runtime.QuarkusApplication;
import io.quarkus.runtime.annotations.QuarkusMain;

/**
 * Drools编译器早期配置
 * 在Quarkus应用启动的最早阶段设置ECJ编译器
 */
@QuarkusMain
public class DroolsEarlyConfig {
    
    // 静态初始化块 - 在类加载时立即执行
    static {
        System.setProperty("drools.dialect.java.compiler", "ECLIPSE");
        System.setProperty("drools.dialect.java.compiler.lnglevel", "17");
        System.setProperty("drools.dialect.java.strict", "false");
        System.err.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        System.err.println("🔧 [最早期初始化] Drools ECJ配置已设置");
        System.err.println("   drools.dialect.java.compiler=ECLIPSE");
        System.err.println("   drools.dialect.java.compiler.lnglevel=17");
        System.err.println("   drools.dialect.java.strict=false");
        System.err.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    }
    
    public static void main(String... args) {
        System.err.println("✅ DroolsEarlyConfig主类启动");
        Quarkus.run(QuarkusAppWrapper.class, args);
    }
    
    public static class QuarkusAppWrapper implements QuarkusApplication {
        @Override
        public int run(String... args) throws Exception {
            System.err.println("✅ Quarkus应用包装器运行");
            Quarkus.waitForExit();
            return 0;
        }
    }
}

