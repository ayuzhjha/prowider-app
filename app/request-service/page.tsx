"use client";

import { useState } from "react";
import { 
  Box, Container, Heading, Text, VStack, FormControl, FormLabel, 
  Input, Select, Textarea, Button, FormErrorMessage, Alert, 
  AlertIcon, SimpleGrid, Flex, Circle, Badge, Divider, HStack
} from "@chakra-ui/react";
import { FiCheck } from "react-icons/fi";
import NextLink from "next/link";

interface SubmitResult {
  success: boolean;
  lead?: {
    id: string;
    name: string;
    serviceName: string;
    city: string;
    assignedProviders: number[];
    createdAt: string;
  };
  error?: string;
  message?: string;
}

const SERVICE_OPTIONS = [
  { value: "1", label: "Service 1" },
  { value: "2", label: "Service 2" },
  { value: "3", label: "Service 3" },
];

export default function RequestServicePage() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    city: "",
    serviceId: "",
    description: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.phone.trim()) errs.phone = "Phone is required";
    else if (!/^\\d{10,}$/.test(form.phone.trim()))
      errs.phone = "Enter a valid phone number (digits only, min 10)";
    if (!form.city.trim()) errs.city = "City is required";
    if (!form.serviceId) errs.serviceId = "Please select a service";
    if (!form.description.trim()) errs.description = "Description is required";
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          phone: form.phone.trim(),
          serviceId: Number(form.serviceId),
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setResult({ success: false, error: data.message });
      } else if (!res.ok) {
        setResult({
          success: false,
          error: data.error || "Something went wrong. Please try again.",
        });
      } else {
        setResult({ success: true, lead: data.lead });
        setForm({ name: "", phone: "", city: "", serviceId: "", description: "" });
      }
    } catch {
      setResult({ success: false, error: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((errs) => ({ ...errs, [name]: "" }));
  };

  if (result?.success && result.lead) {
    return (
      <Container maxW="container.md" py={20}>
        <Box bg="white" p={10} borderRadius="2xl" shadow="xl" textAlign="center" borderWidth="1px" borderColor="gray.100">
          <Circle size="80px" bg="green.50" color="green.500" mx="auto" mb={6}>
            <FiCheck size="32px" />
          </Circle>
          <Heading as="h1" size="xl" mb={4} color="gray.800">Lead Submitted Successfully!</Heading>
          <Text color="gray.500" mb={8} fontSize="lg">
            Your service enquiry has been received and assigned to{" "}
            <Text as="span" fontWeight="bold" color="gray.800">{result.lead.assignedProviders.length} providers</Text>.
          </Text>

          <Box bg="gray.50" p={6} borderRadius="xl" textAlign="left" mb={8}>
            <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase" mb={4} letterSpacing="wider">
              Lead Details
            </Text>
            <VStack align="stretch" spacing={3}>
              {[
                { label: "Name", value: result.lead.name },
                { label: "Service", value: result.lead.serviceName },
                { label: "City", value: result.lead.city },
                { label: "Lead ID", value: result.lead.id.slice(-8).toUpperCase() },
              ].map((item) => (
                <Flex key={item.label}>
                  <Text color="gray.500" w="100px">{item.label}:</Text>
                  <Text fontWeight="medium" color="gray.800">{item.value}</Text>
                </Flex>
              ))}
            </VStack>
          </Box>

          <Box mb={10}>
            <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase" mb={4} letterSpacing="wider">
              Assigned Providers
            </Text>
            <HStack spacing={3} justify="center" wrap="wrap">
              {result.lead.assignedProviders.map((pid) => (
                <Badge key={pid} colorScheme="brand" variant="subtle" px={4} py={2} borderRadius="full" fontSize="sm">
                  Provider {pid}
                </Badge>
              ))}
            </HStack>
          </Box>

          <Flex gap={4} justify="center">
            <Button id="submit-another-btn" onClick={() => setResult(null)} variant="outline" size="lg">
              Submit Another
            </Button>
            <NextLink href="/dashboard" passHref>
              <Button id="view-dashboard-btn" as="a" colorScheme="brand" size="lg">
                📊 View Dashboard
              </Button>
            </NextLink>
          </Flex>
        </Box>
      </Container>
    );
  }

  return (
    <Box py={16}>
      <Container maxW="container.md">
        <Box textAlign="center" mb={12}>
          <Heading as="h1" size="2xl" mb={4}>Request a Service</Heading>
          <Text color="gray.500" fontSize="lg">
            Fill in your details and we'll connect you with the best providers.
          </Text>
        </Box>

        <Box bg="white" p={{ base: 6, md: 10 }} borderRadius="2xl" shadow="xl" borderWidth="1px" borderColor="gray.100">
          <form id="service-request-form" onSubmit={handleSubmit} noValidate>
            <VStack spacing={6} align="stretch">
              {result && !result.success && (
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  {result.error}
                </Alert>
              )}

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                <FormControl isInvalid={!!errors.name} isRequired>
                  <FormLabel htmlFor="name" fontSize="sm" fontWeight="bold" color="gray.700">Full Name</FormLabel>
                  <Input id="name" name="name" placeholder="Arjun Sharma" value={form.name} onChange={handleChange} autoComplete="name" size="lg" bg="gray.50" />
                  <FormErrorMessage>{errors.name}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors.phone} isRequired>
                  <FormLabel htmlFor="phone" fontSize="sm" fontWeight="bold" color="gray.700">Phone Number</FormLabel>
                  <Input id="phone" name="phone" type="tel" placeholder="9999999999" value={form.phone} onChange={handleChange} autoComplete="tel" maxLength={15} size="lg" bg="gray.50" />
                  <FormErrorMessage>{errors.phone}</FormErrorMessage>
                </FormControl>
              </SimpleGrid>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                <FormControl isInvalid={!!errors.city} isRequired>
                  <FormLabel htmlFor="city" fontSize="sm" fontWeight="bold" color="gray.700">City</FormLabel>
                  <Input id="city" name="city" placeholder="Mumbai" value={form.city} onChange={handleChange} size="lg" bg="gray.50" />
                  <FormErrorMessage>{errors.city}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors.serviceId} isRequired>
                  <FormLabel htmlFor="serviceId" fontSize="sm" fontWeight="bold" color="gray.700">Service Type</FormLabel>
                  <Select id="serviceId" name="serviceId" placeholder="Select a service…" value={form.serviceId} onChange={handleChange} size="lg" bg="gray.50">
                    {SERVICE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </Select>
                  <FormErrorMessage>{errors.serviceId}</FormErrorMessage>
                </FormControl>
              </SimpleGrid>

              <FormControl isInvalid={!!errors.description} isRequired>
                <FormLabel htmlFor="description" fontSize="sm" fontWeight="bold" color="gray.700">Description</FormLabel>
                <Textarea id="description" name="description" placeholder="Briefly describe what you need help with…" value={form.description} onChange={handleChange} rows={4} size="lg" bg="gray.50" />
                <FormErrorMessage>{errors.description}</FormErrorMessage>
              </FormControl>

              <Alert status="info" borderRadius="md" bg="brand.50" color="brand.900" border="1px" borderColor="brand.100">
                <AlertIcon color="brand.500" />
                <Text fontSize="sm">The same phone number cannot submit two enquiries for the same service type.</Text>
              </Alert>

              <Button id="submit-lead-btn" type="submit" colorScheme="brand" size="lg" w="full" isLoading={loading} loadingText="Submitting…">
                Submit Enquiry
              </Button>
            </VStack>
          </form>
        </Box>
      </Container>
    </Box>
  );
}
