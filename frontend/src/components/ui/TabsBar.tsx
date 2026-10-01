import React from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import { tokens } from '../../theme/tokens';

export interface TabItem {
  id: string | number;
  label: string;
  icon?: React.ReactElement;
  badge?: React.ReactNode;
}

interface TabsBarProps {
  tabs: TabItem[];
  value: string | number;
  onChange: (value: any) => void;
}

export const TabsBar: React.FC<TabsBarProps> = ({ tabs, value, onChange }) => {
  return (
    <Box
      sx={{
        borderBottom: `1px solid ${tokens.colors.background.border}`,
        mb: 3,
      }}
    >
      <Tabs
        value={value}
        onChange={(_, val) => onChange(val)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: '44px',
          '& .MuiTabs-indicator': {
            backgroundColor: tokens.colors.brand.primary,
            height: 3,
            borderRadius: '3px 3px 0 0',
          },
        }}
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            value={tab.id}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>{tab.label}</span>
                {tab.badge}
              </Box>
            }
            icon={tab.icon}
            iconPosition="start"
            sx={{
              minHeight: '44px',
              py: 1,
              px: 2,
              fontWeight: 600,
              fontSize: '0.875rem',
              color: tokens.colors.text.secondary,
              '&.Mui-selected': {
                color: tokens.colors.brand.primary,
              },
            }}
          />
        ))}
      </Tabs>
    </Box>
  );
};
