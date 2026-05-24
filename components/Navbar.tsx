"use client";

import { usePathname } from "next/navigation";
import { Box, Flex, HStack, Button, Image, Badge, Text, Container } from '@chakra-ui/react';
import NextLink from "next/link";

const navLinks = [
  { href: "/request-service", label: "Request Service", icon: "📋" },
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/test-tools", label: "Test Tools", icon: "🔧" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <Box as="nav" bg="white" borderBottom="1px" borderColor="gray.200" position="sticky" top="0" zIndex="100" boxShadow="sm">
      <Container maxW="container.xl">
        <Flex h="16" alignItems="center" justify="space-between">
          <NextLink href="/" passHref style={{ textDecoration: 'none' }}>
            <HStack spacing={3}>
              <Image src="/logo.png" alt="Prowider Logo" boxSize="36px" borderRadius="md" objectFit="contain" />
              <Text fontSize="xl" fontWeight="extrabold" color="brand.600" fontFamily="heading">
                Prowider
              </Text>
              <Badge colorScheme="brand" variant="subtle" fontSize="0.6em" borderRadius="sm" px={2}>
                Beta
              </Badge>
            </HStack>
          </NextLink>

          <HStack spacing={4}>
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <NextLink key={link.href} href={link.href} passHref>
                  <Button
                    as="span"
                    id={`nav-${link.href.replace("/", "").replace("-", "_")}`}
                    variant={isActive ? "solid" : "ghost"}
                    colorScheme={isActive ? "brand" : "gray"}
                    leftIcon={<Text as="span">{link.icon}</Text>}
                    size="sm"
                    fontWeight="semibold"
                  >
                    {link.label}
                  </Button>
                </NextLink>
              );
            })}
          </HStack>
        </Flex>
      </Container>
    </Box>
  );
}
