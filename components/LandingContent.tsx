"use client";

import { Box, Container, Heading, Text, Button, SimpleGrid, VStack, Badge, Flex, HStack } from "@chakra-ui/react";
import NextLink from "next/link";

export default function LandingContent() {
  return (
    <Box>
      {/* Hero Section */}
      <Box position="relative" overflow="hidden" pt={20} pb={32}>
        <Box 
          position="absolute" inset={0} zIndex={-1} 
          bg="radial-gradient(circle at 50% 50%, rgba(229, 62, 62, 0.05) 0%, transparent 50%)" 
        />
        <Container maxW="container.xl" textAlign="center">
          <VStack spacing={6}>
            <Badge colorScheme="brand" variant="subtle" px={4} py={1} borderRadius="full" textTransform="none" fontSize="sm">
              <Box as="span" w={2} h={2} bg="brand.500" borderRadius="full" display="inline-block" mr={2} />
              Live Lead Distribution Platform
            </Badge>
            
            <Heading as="h1" size="3xl" fontWeight="extrabold" letterSpacing="tight" lineHeight="1.2">
              Smart Leads,<br />
              <Box as="span" bgGradient="linear(to-r, brand.400, brand.600)" bgClip="text">
                Fair Distribution
              </Box>
            </Heading>
            
            <Text fontSize="xl" color="gray.500" maxW="2xl">
              Prowider automatically routes service enquiries to the right providers
              using intelligent round-robin allocation — fairly, reliably, and in real time.
            </Text>
            
            <HStack spacing={4} pt={4}>
              <NextLink href="/request-service" passHref>
                <Button id="hero-cta-request" size="lg" colorScheme="brand" variant="solid" px={8}>
                  📋 Submit a Service Enquiry
                </Button>
              </NextLink>
              <NextLink href="/dashboard" passHref>
                <Button id="hero-cta-dashboard" size="lg" colorScheme="gray" variant="outline" px={8}>
                  📊 View Provider Dashboard
                </Button>
              </NextLink>
            </HStack>
          </VStack>
        </Container>
      </Box>

      {/* Features Section */}
      <Box py={20} bg="white">
        <Container maxW="container.xl">
          <VStack spacing={16}>
            <Heading as="h2" size="xl" textAlign="center">
              How It Works
            </Heading>
            
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={10} w="full">
              {[
                { icon: "📝", title: "Customer Enquiry", desc: "Customers submit service enquiries through a simple form. Duplicate submissions are blocked at the database level.", color: "blue" },
                { icon: "⚡", title: "Instant Allocation", desc: "The system instantly assigns exactly 3 providers — mandatory ones first, then fair round-robin from the service pool.", color: "brand" },
                { icon: "🔄", title: "Fair Distribution", desc: "Round-robin allocation persists in the database, ensuring no provider is favored repeatedly over time.", color: "orange" },
                { icon: "📡", title: "Real-Time Updates", desc: "Providers see new leads instantly via Server-Sent Events — no page refresh required.", color: "purple" },
                { icon: "🛡️", title: "Quota Enforcement", desc: "Each provider's monthly quota (10 leads) is enforced atomically. Providers at quota are skipped automatically.", color: "red" },
                { icon: "🔒", title: "Idempotent Webhooks", desc: "Quota resets via webhook are idempotent — calling the same event multiple times has no duplicate effect.", color: "teal" }
              ].map((feature, i) => (
                <Box key={i} p={6} bg="gray.50" borderRadius="xl" borderWidth="1px" borderColor="gray.100" transition="all 0.2s" _hover={{ transform: 'translateY(-4px)', shadow: 'md', borderColor: `${feature.color}.200` }}>
                  <Flex align="center" justify="center" w={12} h={12} bg={`${feature.color}.100`} borderRadius="lg" mb={4} fontSize="xl">
                    {feature.icon}
                  </Flex>
                  <Heading as="h3" size="md" mb={2}>{feature.title}</Heading>
                  <Text color="gray.600">{feature.desc}</Text>
                </Box>
              ))}
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      {/* Allocation Rules Summary */}
      <Box py={20}>
        <Container maxW="container.xl">
          <Box p={8} bg="white" borderRadius="2xl" shadow="sm" borderWidth="1px" borderColor="gray.200">
            <Heading as="h2" size="lg" mb={8}>
              📌 Allocation Rules
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
              {[
                { service: "Service 1", mandatory: "Provider 1", pool: "Providers 2, 3, 4", color: "blue.500" },
                { service: "Service 2", mandatory: "Provider 5", pool: "Providers 6, 7, 8", color: "brand.500" },
                { service: "Service 3", mandatory: "Provider 1 + Provider 4", pool: "Providers 2, 3, 5, 6, 7, 8", color: "orange.500" },
              ].map((rule) => (
                <Box key={rule.service} p={6} bg="gray.50" borderRadius="xl" borderTop="4px solid" borderTopColor={rule.color}>
                  <Heading as="h4" size="md" color={rule.color} mb={4}>{rule.service}</Heading>
                  <VStack align="start" spacing={2} fontSize="sm">
                    <Text><Text as="span" color="gray.500">Mandatory:</Text> <Text as="span" fontWeight="bold">{rule.mandatory}</Text></Text>
                    <Text><Text as="span" color="gray.500">Pool:</Text> <Text as="span" color="gray.700">{rule.pool}</Text></Text>
                  </VStack>
                </Box>
              ))}
            </SimpleGrid>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
