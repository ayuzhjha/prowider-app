"use client";

import { useState, useEffect } from "react";
import { 
  Box, Container, Heading, Text, Button, VStack, HStack, Flex, 
  Spinner, Alert, AlertIcon, SimpleGrid, Code 
} from "@chakra-ui/react";

// Generate a unique event ID for idempotency (browser-compatible)
function genEventId() {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

interface TestResult {
  timestamp: string;
  status: "success" | "error" | "info";
  label: string;
  data: unknown;
}

export default function TestToolsPage() {
  const [webhookResults, setWebhookResults] = useState<TestResult[]>([]);
  const [genResults, setGenResults] = useState<TestResult[]>([]);
  const [seedResult, setSeedResult] = useState<TestResult | null>(null);
  const [loadingWebhook, setLoadingWebhook] = useState(false);
  const [loadingWebhookMulti, setLoadingWebhookMulti] = useState(false);
  const [loadingGen, setLoadingGen] = useState(false);
  const [loadingSeed, setLoadingSeed] = useState(false);
  const [currentEventId, setCurrentEventId] = useState("");

  useEffect(() => {
    setCurrentEventId(genEventId());
  }, []);

  const addResult = (
    setter: React.Dispatch<React.SetStateAction<TestResult[]>>,
    label: string,
    status: TestResult["status"],
    data: unknown
  ) => {
    setter((prev) =>
      [
        {
          timestamp: new Date().toLocaleTimeString(),
          status,
          label,
          data,
        },
        ...prev,
      ].slice(0, 20)
    );
  };

  // Reset quota once
  const handleResetQuota = async () => {
    setLoadingWebhook(true);
    const eventId = genEventId();
    setCurrentEventId(eventId);

    try {
      const res = await fetch("/api/webhook/reset-quota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      const data = await res.json();
      addResult(
        setWebhookResults,
        `Reset Quota (eventId: ${eventId.slice(-8)})`,
        res.ok ? "success" : "error",
        data
      );
    } catch (err) {
      addResult(setWebhookResults, "Reset Quota", "error", { error: String(err) });
    } finally {
      setLoadingWebhook(false);
    }
  };

  // Call webhook 5 times with the SAME eventId to test idempotency
  const handleWebhookMultiple = async () => {
    setLoadingWebhookMulti(true);
    const eventId = currentEventId;

    addResult(
      setWebhookResults,
      `🔁 Sending same eventId 5 times: ${eventId.slice(-8)}`,
      "info",
      { message: "Testing idempotency…" }
    );

    const calls = Array.from({ length: 5 }, (_, i) =>
      fetch("/api/webhook/reset-quota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      })
        .then((r) => r.json().then((d) => ({ call: i + 1, ...d })))
        .catch((e) => ({ call: i + 1, error: String(e) }))
    );

    const results = await Promise.all(calls);
    const processed = results.filter((r) => !r.alreadyProcessed).length;
    const skipped = results.filter((r) => r.alreadyProcessed).length;

    addResult(
      setWebhookResults,
      `Idempotency Test Results`,
      "success",
      {
        eventId: eventId.slice(-8),
        totalCalls: 5,
        actuallyProcessed: processed,
        skippedAsDuplicate: skipped,
        results,
      }
    );
    setLoadingWebhookMulti(false);
  };

  // Generate 10 leads concurrently
  const handleGenLeads = async () => {
    setLoadingGen(true);
    addResult(
      setGenResults,
      "Generating 10 leads concurrently…",
      "info",
      { message: "Sending 10 simultaneous lead creation requests" }
    );

    try {
      const res = await fetch("/api/test/gen-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 10 }),
      });
      const data = await res.json();
      addResult(setGenResults, `Concurrent Leads Result`, res.ok ? "success" : "error", data);
    } catch (err) {
      addResult(setGenResults, "Generate Leads", "error", { error: String(err) });
    } finally {
      setLoadingGen(false);
    }
  };

  // Seed database
  const handleSeed = async (force: boolean) => {
    setLoadingSeed(true);
    try {
      const res = await fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const data = await res.json();
      setSeedResult({
        timestamp: new Date().toLocaleTimeString(),
        status: res.ok ? "success" : "error",
        label: force ? "Force Re-seed" : "Seed DB",
        data,
      });
    } catch (err) {
      setSeedResult({
        timestamp: new Date().toLocaleTimeString(),
        status: "error",
        label: "Seed DB",
        data: { error: String(err) },
      });
    } finally {
      setLoadingSeed(false);
    }
  };

  const formatResult = (result: TestResult) => {
    return `[${result.timestamp}] ${result.label}\n${JSON.stringify(result.data, null, 2)}`;
  };

  const renderResultBox = (results: TestResult[]) => {
    if (results.length === 0) return null;
    return (
      <Box mt={6} p={4} bg="gray.800" color="gray.200" borderRadius="md" maxH="300px" overflowY="auto" fontSize="sm" fontFamily="mono">
        <VStack align="stretch" spacing={4}>
          {results.map((r, i) => (
            <Box key={i} borderBottomWidth="1px" borderColor="gray.700" pb={3} color={r.status === 'error' ? 'red.400' : r.status === 'success' ? 'green.400' : 'blue.400'}>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{formatResult(r)}</pre>
            </Box>
          ))}
        </VStack>
      </Box>
    );
  };

  return (
    <Box py={16}>
      <Container maxW="container.lg">
        <Box mb={8}>
          <Heading as="h1" size="2xl" mb={4}>🔧 Test Tools</Heading>
          <Text color="gray.500" fontSize="lg">
            Simulate payment webhooks, test idempotency, and stress-test concurrent lead generation.
          </Text>
        </Box>

        <Alert status="warning" mb={8} borderRadius="md">
          <AlertIcon />
          ⚠️ These tools simulate backend events. Quota can ONLY be reset via webhook — not through the normal UI.
        </Alert>

        <VStack spacing={8} align="stretch">
          
          {/* Database Seeding */}
          <Box p={6} bg="white" borderRadius="xl" shadow="md" borderWidth="1px" borderColor="gray.200">
            <Flex align="center" gap={4} mb={4}>
              <Flex align="center" justify="center" w={12} h={12} bg="purple.100" color="purple.600" borderRadius="lg" fontSize="2xl">
                🌱
              </Flex>
              <Box>
                <Heading as="h2" size="md">Database Seeding</Heading>
                <Text color="gray.500" fontSize="sm">Initialize the database with required data. Use "Force Re-seed" to wipe all data first.</Text>
              </Box>
            </Flex>
            <HStack spacing={4}>
              <Button onClick={() => handleSeed(false)} isLoading={loadingSeed} colorScheme="gray" variant="outline">
                🌱 Seed Database
              </Button>
              <Button onClick={() => handleSeed(true)} isLoading={loadingSeed} colorScheme="red">
                ⚠️ Force Re-seed
              </Button>
            </HStack>
            {seedResult && renderResultBox([seedResult])}
          </Box>

          {/* Webhook Simulation */}
          <Box p={6} bg="white" borderRadius="xl" shadow="md" borderWidth="1px" borderColor="gray.200">
            <Flex align="center" gap={4} mb={4}>
              <Flex align="center" justify="center" w={12} h={12} bg="green.100" color="green.600" borderRadius="lg" fontSize="2xl">
                💳
              </Flex>
              <Box>
                <Heading as="h2" size="md">Webhook Simulation — Quota Reset</Heading>
                <Text color="gray.500" fontSize="sm">Simulates a payment gateway webhook confirming subscription renewal.</Text>
              </Box>
            </Flex>
            <HStack spacing={4} mb={4}>
              <Button onClick={handleResetQuota} isLoading={loadingWebhook || loadingWebhookMulti} colorScheme="green">
                ✅ Reset Provider Quota
              </Button>
              <Button onClick={handleWebhookMultiple} isLoading={loadingWebhook || loadingWebhookMulti} colorScheme="yellow" color="white" _hover={{ bg: "yellow.500" }}>
                🔁 Call Webhook 5× Same ID
              </Button>
            </HStack>
            <Text fontSize="sm" color="gray.500" fontFamily="mono">
              Current Event ID: <Code>{currentEventId}</Code>
            </Text>
            {renderResultBox(webhookResults)}
          </Box>

          {/* Concurrent Lead Generation */}
          <Box p={6} bg="white" borderRadius="xl" shadow="md" borderWidth="1px" borderColor="gray.200">
            <Flex align="center" gap={4} mb={4}>
              <Flex align="center" justify="center" w={12} h={12} bg="red.100" color="red.600" borderRadius="lg" fontSize="2xl">
                ⚡
              </Flex>
              <Box>
                <Heading as="h2" size="md">Concurrent Lead Generation</Heading>
                <Text color="gray.500" fontSize="sm">Generates 10 leads simultaneously to stress-test concurrency safety.</Text>
              </Box>
            </Flex>
            <HStack spacing={4}>
              <Button onClick={handleGenLeads} isLoading={loadingGen} colorScheme="red">
                ⚡ Generate 10 Leads Concurrently
              </Button>
            </HStack>
            {renderResultBox(genResults)}
          </Box>

        </VStack>
      </Container>
    </Box>
  );
}
