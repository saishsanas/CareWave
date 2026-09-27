package com.CareWave.carewave_backend.config;

import com.CareWave.carewave_backend.dto.EmergencyNotificationRequestedEvent;
import org.apache.kafka.clients.admin.AdminClientConfig;
import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.*;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.kafka.support.serializer.JsonSerializer;

import java.util.HashMap;
import java.util.Map;

@Configuration
@EnableKafka
public class KafkaConfig {

    private static final Logger log = LoggerFactory.getLogger(KafkaConfig.class);

    @Value("${spring.kafka.bootstrap-servers:localhost:9092}")
    private String bootstrapServers;

    @Value("${spring.kafka.properties.security.protocol:}")
    private String securityProtocol;

    @Value("${spring.kafka.properties.sasl.mechanism:}")
    private String saslMechanism;

    @Value("${spring.kafka.properties.sasl.jaas.config:}")
    private String saslJaasConfig;

    @Value("${spring.kafka.properties.ssl.truststore.type:${SPRING_KAFKA_PROPERTIES_SSL_TRUSTSTORE_TYPE:}}")
    private String sslTruststoreType;

    @Value("${spring.kafka.properties.ssl.truststore.certificates:${SPRING_KAFKA_PROPERTIES_SSL_TRUSTSTORE_CERTIFICATES:${AIVEN_KAFKA_CA_CERT:}}}")
    private String sslTruststoreCertificates;

    @Value("${spring.kafka.properties.ssl.truststore.location:${SPRING_KAFKA_PROPERTIES_SSL_TRUSTSTORE_LOCATION:}}")
    private String sslTruststoreLocation;

    @Value("${spring.kafka.properties.ssl.truststore.password:${SPRING_KAFKA_PROPERTIES_SSL_TRUSTSTORE_PASSWORD:}}")
    private String sslTruststorePassword;

    private void applySecurityProps(Map<String, Object> props) {
        if (securityProtocol != null && !securityProtocol.isBlank()) {
            props.put("security.protocol", securityProtocol.trim());
        }
        if (saslMechanism != null && !saslMechanism.isBlank()) {
            props.put("sasl.mechanism", saslMechanism.trim());
        }
        if (saslJaasConfig != null && !saslJaasConfig.isBlank()) {
            props.put("sasl.jaas.config", saslJaasConfig.trim());
        }

        if (sslTruststoreCertificates != null && !sslTruststoreCertificates.isBlank()) {
            String pem = sslTruststoreCertificates.trim().replace("\\n", "\n");
            props.put("ssl.truststore.type", "PEM");
            props.put("ssl.truststore.certificates", pem);
            log.info("[KAFKA] Configured inline PEM truststore with CA certificate (Length: {} bytes)", pem.length());
        } else {
            if (sslTruststoreType != null && !sslTruststoreType.isBlank()) {
                props.put("ssl.truststore.type", sslTruststoreType.trim());
            }
            if (sslTruststoreLocation != null && !sslTruststoreLocation.isBlank()) {
                props.put("ssl.truststore.location", sslTruststoreLocation.trim());
            }
            if (sslTruststorePassword != null && !sslTruststorePassword.isBlank()) {
                props.put("ssl.truststore.password", sslTruststorePassword.trim());
            }
        }
    }

    @Bean
    public KafkaAdmin kafkaAdmin() {
        Map<String, Object> configs = new HashMap<>();
        configs.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        applySecurityProps(configs);
        KafkaAdmin admin = new KafkaAdmin(configs);
        admin.setAutoCreate(false);
        return admin;
    }

    @Bean
    public NewTopic emergencyEventsTopic() {
        return TopicBuilder.name("carewave-emergency-events")
                .partitions(1)
                .replicas(1)
                .build();
    }

    @Bean
    public ProducerFactory<String, EmergencyNotificationRequestedEvent> producerFactory() {
        Map<String, Object> configProps = new HashMap<>();
        configProps.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        configProps.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        configProps.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        configProps.put(ProducerConfig.MAX_BLOCK_MS_CONFIG, 2000); // 2 second timeout for producer to prevent blocking HTTP threads if broker down
        applySecurityProps(configProps);
        return new DefaultKafkaProducerFactory<>(configProps);
    }

    @Bean
    public KafkaTemplate<String, EmergencyNotificationRequestedEvent> kafkaTemplate() {
        return new KafkaTemplate<>(producerFactory());
    }

    @Bean
    public ConsumerFactory<String, EmergencyNotificationRequestedEvent> consumerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "carewave-notification-group");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, JsonDeserializer.class);
        props.put(JsonDeserializer.TRUSTED_PACKAGES, "com.CareWave.carewave_backend.dto");
        applySecurityProps(props);
        return new DefaultKafkaConsumerFactory<>(props, new StringDeserializer(), new JsonDeserializer<>(EmergencyNotificationRequestedEvent.class, false));
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, EmergencyNotificationRequestedEvent> kafkaListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, EmergencyNotificationRequestedEvent> factory =
                new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory());
        return factory;
    }
}
