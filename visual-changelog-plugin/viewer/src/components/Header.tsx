import { useState, useEffect } from "react";
import { Flex, Text, Button, IconButton } from "@chakra-ui/react";
import { navigate } from "../lib/router";

function useColorMode() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    if (!document.documentElement.classList.contains("dark") && !document.documentElement.classList.contains("light")) {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.add(prefersDark ? "dark" : "light");
      setDark(prefersDark);
    }
  }, []);
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.classList.toggle("light", !next);
    setDark(next);
  };
  return { dark, toggle };
}

export function Header({ showBack }: { showBack?: boolean }) {
  const { dark, toggle } = useColorMode();

  return (
    <Flex
      as="header"
      position="sticky"
      top={0}
      zIndex={10}
      align="center"
      justify="space-between"
      px={6}
      py={3}
      borderBottomWidth="1px"
      bg={{ _light: "white", _dark: "gray.900" }}
    >
      <Flex align="center" gap={3}>
        {showBack && (
          <Button variant="ghost" size="sm" onClick={() => navigate({ page: "timeline" })}>
            ← Timeline
          </Button>
        )}
        <Text fontSize="lg" fontWeight="bold">Visual Changelog</Text>
      </Flex>
      <IconButton
        aria-label="Toggle color mode"
        size="sm"
        variant="ghost"
        onClick={toggle}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {dark ? (
            <>
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </>
          ) : (
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          )}
        </svg>
      </IconButton>
    </Flex>
  );
}
