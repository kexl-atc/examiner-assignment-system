package com.examiner.scheduler.config;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import org.optaplanner.core.api.score.buildin.hardsoft.HardSoftScore;

import java.io.IOException;

/**
 * HardSoftScore的自定义Jackson反序列化器
 * 支持从数字或对象格式反序列化HardSoftScore
 */
public class HardSoftScoreDeserializer extends JsonDeserializer<HardSoftScore> {
    
    @Override
    public HardSoftScore deserialize(JsonParser parser, DeserializationContext context) throws IOException {
        if (parser.getCurrentToken().isNumeric()) {
            // 如果是数字，作为软约束分数处理
            int softScore = parser.getIntValue();
            return HardSoftScore.ofSoft(softScore);
        } else if (parser.getCurrentToken().isStructStart()) {
            // 如果是对象，解析hardScore和softScore字段
            parser.nextToken(); // 移动到第一个字段
            int hardScore = 0;
            int softScore = 0;
            
            while (parser.getCurrentToken() != null && !parser.getCurrentToken().isStructEnd()) {
                String fieldName = parser.getCurrentName();
                parser.nextToken();
                
                if ("hardScore".equals(fieldName)) {
                    hardScore = parser.getIntValue();
                } else if ("softScore".equals(fieldName)) {
                    softScore = parser.getIntValue();
                }
                
                parser.nextToken();
            }
            
            return HardSoftScore.of(hardScore, softScore);
        } else {
            // 默认返回0分
            return HardSoftScore.ZERO;
        }
    }
}