"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { 
  Box, Container, Flex, Text, Heading, SimpleGrid, Badge, Button, 
  CircularProgress, CircularProgressLabel, VStack, HStack, Alert, 
  AlertIcon, Spinner, Center, Tooltip, Divider, Circle
} from "@chakra-ui/react";
import { FiRefreshCw, FiWifi, FiWifiOff } from "react-icons/fi";

interface LeadInfo {
  id: string;
  name: string;
  phone: string;
  city: string;
  serviceId: number;
  serviceName: string;
  description: string;
  createdAt: string;
}

interface ProviderData {
  providerId: number;
  name: string;
  monthlyQuota: number;
  leadsReceived: number;
  quotaRemaining: number;
  assignedLeads: LeadInfo[];
}

interface SSEEvent {
  type: string;
  leadId?: string;
  serviceId?: number;
  assignedProviders?: number[];
  timestamp?: string;
  clientId?: string;
}

export default function DashboardPage() {
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sseStatus, setSseStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [highlightedProviders, setHighlightedProviders] = useState<Set<number>>(new Set());
  const [newLeadIds, setNewLeadIds] = useState<Set<string>>(new Set());
  const sseRef = useRef<EventSource | null>(null);

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch("/api/providers");
      if (!res.ok) throw new Error("Failed to fetch providers");
      const data = await res.json();
      setProviders(data.providers);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  // SSE setup
  useEffect(() => {
    fetchProviders();

    const connect = () => {
      const es = new EventSource("/api/sse/dashboard");
      sseRef.current = es;

      es.onopen = () => {
        setSseStatus("connected");
      };

      es.onmessage = (event) => {
        try {
          const data: SSEEvent = JSON.parse(event.data);

          if (data.type === "connected") {
            setSseStatus("connected");
            return;
          }

          if (data.type === "heartbeat") return;

          if (data.type === "new_lead") {
            setLastUpdate(new Date().toLocaleTimeString());

            // Highlight affected providers
            if (data.assignedProviders) {
              setHighlightedProviders(new Set(data.assignedProviders));
              setTimeout(() => setHighlightedProviders(new Set()), 2500);
            }

            // Track new lead IDs briefly for animation
            if (data.leadId) {
              setNewLeadIds((prev) => new Set([...prev, data.leadId!]));
              setTimeout(() => {
                setNewLeadIds((prev) => {
                  const next = new Set(prev);
                  next.delete(data.leadId!);
                  return next;
                });
              }, 3000);
            }

            // Re-fetch updated provider data
            fetchProviders();
          }
        } catch {
          // Ignore parse errors
        }
      };

      es.onerror = () => {
        setSseStatus("disconnected");
        es.close();
        // Reconnect after 3 seconds
        setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      sseRef.current?.close();
    };
  }, [fetchProviders]);

  const totalLeads = providers.reduce((sum, p) => sum + p.leadsReceived, 0);
  const totalQuotaUsed = providers.reduce((sum, p) => sum + (10 - p.monthlyQuota), 0);
  const providersAtCapacity = providers.filter((p) => p.monthlyQuota === 0).length;
  const totalConnected = providers.length;

  const getQuotaColor = (quota: number) => {
    if (quota >= 7) return "green.500";
    if (quota >= 4) return "yellow.500";
    return "red.500";
  };

  if (loading) {
    return (
      <Center minH="80vh" flexDirection="column" gap={4}>
        <Spinner size="xl" color="brand.500" thickness="4px" />
        <Text color="gray.500">Loading dashboard…</Text>
      </Center>
    );
  }

  if (error) {
    return (
      <Container maxW="container.md" py={20}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
        <Button mt={4} colorScheme="brand" onClick={() => { setLoading(true); fetchProviders(); }}>
          Retry
        </Button>
      </Container>
    );
  }

  return (
    <Box py={8}>
      <Container maxW="container.xl">
        {/* Dashboard Header */}
        <Flex justify="space-between" align="flex-end" mb={8} wrap="wrap" gap={4}>
          <Box>
            <Heading as="h1" size="xl" mb={2}>Provider Dashboard</Heading>
            <Text color="gray.500">Real-time lead allocation overview for all providers</Text>
          </Box>

          <VStack align="flex-end" spacing={2}>
            <HStack>
              {sseStatus === "connected" ? <Circle size="10px" bg="green.500" /> : <Circle size="10px" bg="red.500" />}
              <Text fontSize="sm" fontWeight="medium" color="gray.600">
                {sseStatus === "connected" ? "Live" : sseStatus === "connecting" ? "Connecting…" : "Reconnecting…"}
              </Text>
            </HStack>
            {lastUpdate && <Text fontSize="xs" color="gray.400">Last update: {lastUpdate}</Text>}
            <Button size="sm" leftIcon={<FiRefreshCw />} onClick={() => { setLoading(true); fetchProviders(); }} variant="outline">
              Refresh
            </Button>
          </VStack>
        </Flex>

        {/* Stats Bar */}
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={6} mb={10}>
          {[
            { label: "Total Leads", value: totalLeads, sub: "across all providers", color: "brand.500" },
            { label: "Quota Used", value: totalQuotaUsed, sub: `out of ${totalConnected * 10} total`, color: "yellow.500" },
            { label: "At Capacity", value: providersAtCapacity, sub: "providers full", color: providersAtCapacity > 0 ? "red.500" : "green.500" },
            { label: "Active Providers", value: totalConnected - providersAtCapacity, sub: "with remaining quota", color: "green.500" }
          ].map((stat, i) => (
            <Box key={i} p={6} bg="white" borderRadius="xl" shadow="sm" borderWidth="1px" borderColor="gray.200">
              <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase" letterSpacing="wider" mb={1}>{stat.label}</Text>
              <Text fontSize="4xl" fontWeight="black" color={stat.color} lineHeight="1">{stat.value}</Text>
              <Text fontSize="xs" color="gray.500" mt={1}>{stat.sub}</Text>
            </Box>
          ))}
        </SimpleGrid>

        {/* Provider Grid */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
          {providers.map((provider) => {
            const quotaFillPercent = (provider.monthlyQuota / 10) * 100;
            const isHighlighted = highlightedProviders.has(provider.providerId);

            return (
              <Box 
                key={provider.providerId} 
                bg="white" 
                borderRadius="xl" 
                overflow="hidden"
                borderWidth="1px" 
                borderColor={isHighlighted ? "brand.500" : "gray.200"}
                shadow={isHighlighted ? "lg" : "sm"}
                transition="all 0.3s"
                transform={isHighlighted ? "translateY(-4px)" : "none"}
              >
                {/* Card Header */}
                <Flex p={5} bgGradient="linear(to-br, gray.50, white)" borderBottomWidth="1px" borderColor="gray.100" justify="space-between" align="center">
                  <HStack spacing={4}>
                    <Flex align="center" justify="center" w="48px" h="48px" borderRadius="xl" bg="brand.500" color="white" fontWeight="bold" fontSize="lg">
                      {provider.providerId}
                    </Flex>
                    <Box>
                      <Heading as="h3" size="md" mb={1}>{provider.name}</Heading>
                      <Text fontSize="xs" color="gray.500" fontWeight="medium">ID #{provider.providerId}</Text>
                    </Box>
                  </HStack>

                  <VStack spacing={0}>
                    <CircularProgress value={quotaFillPercent} color={getQuotaColor(provider.monthlyQuota)} size="50px" thickness="12px" trackColor="gray.100">
                      <CircularProgressLabel fontSize="sm" fontWeight="bold" color={getQuotaColor(provider.monthlyQuota)}>
                        {provider.monthlyQuota}
                      </CircularProgressLabel>
                    </CircularProgress>
                    <Text fontSize="2xs" color="gray.500" textTransform="uppercase" fontWeight="bold" mt={1}>Quota Left</Text>
                  </VStack>
                </Flex>

                {/* Stats */}
                <SimpleGrid columns={2} spacing={4} p={5}>
                  <Box>
                    <Text fontSize="xs" color="gray.500" fontWeight="bold" textTransform="uppercase">Leads Received</Text>
                    <Text fontSize="2xl" fontWeight="bold">{provider.leadsReceived}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500" fontWeight="bold" textTransform="uppercase">Quota Remaining</Text>
                    <Text fontSize="2xl" fontWeight="bold" color={getQuotaColor(provider.monthlyQuota)}>{provider.monthlyQuota}</Text>
                  </Box>
                </SimpleGrid>

                <Box px={5} pb={5}>
                  <Box h="6px" bg="gray.100" borderRadius="full" overflow="hidden">
                    <Box h="full" w={`${quotaFillPercent}%`} bg={getQuotaColor(provider.monthlyQuota)} transition="width 0.5s ease" />
                  </Box>
                </Box>

                {/* Assigned Leads */}
                <Box p={5} pt={0}>
                  <Text fontSize="xs" color="gray.500" fontWeight="bold" textTransform="uppercase" mb={3}>
                    Assigned Leads ({provider.assignedLeads.length})
                  </Text>

                  {provider.assignedLeads.length === 0 ? (
                    <Text textAlign="center" color="gray.400" fontSize="sm" py={6}>No leads assigned yet</Text>
                  ) : (
                    <VStack maxH="220px" overflowY="auto" spacing={2} align="stretch" pr={1}>
                      {provider.assignedLeads.map((lead) => (
                        <Flex 
                          key={lead.id} 
                          p={3} 
                          bg={newLeadIds.has(lead.id) ? "brand.50" : "gray.50"} 
                          borderRadius="md" 
                          borderWidth="1px"
                          borderColor={newLeadIds.has(lead.id) ? "brand.200" : "gray.100"}
                          align="flex-start"
                          gap={3}
                          transition="all 0.3s"
                        >
                          <Circle size="8px" bg="brand.500" mt={1.5} flexShrink={0} />
                          <Box flex={1} minW={0}>
                            <Text fontSize="sm" fontWeight="bold" isTruncated>{lead.name}</Text>
                            <Text fontSize="xs" color="gray.500" isTruncated mt={0.5}>
                              {lead.serviceName} · {lead.city} · {new Date(lead.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </Text>
                          </Box>
                          <Badge colorScheme="brand" variant="subtle" fontSize="2xs">S{lead.serviceId}</Badge>
                        </Flex>
                      ))}
                    </VStack>
                  )}
                </Box>
              </Box>
            );
          })}
        </SimpleGrid>
      </Container>
    </Box>
  );
}
