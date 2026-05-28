package com.cephadex.ambi;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import com.cephadex.ambi.config.AmbiApplication;

// Pointed explicitly at AmbiApplication because @SpringBootConfiguration auto-discovery
// walks upward from this package (com.cephadex.ambi) and never reaches the sibling
// com.cephadex.ambi.config sub-package where AmbiApplication actually lives.
@SpringBootTest(classes = AmbiApplication.class)
@ActiveProfiles("test")
class AmbiApplicationTests {

	@Test
	void contextLoads() {
	}

}
