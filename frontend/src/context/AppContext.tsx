import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Client {
  id: string;
  name: string;
  document: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  installationDate: string;
  status: 'ACTIVE' | 'INACTIVE';
  gpsLatitude: number;
  gpsLongitude: number;
}

export interface Usina {
  id: string;
  name: string;
  client?: string; // mapped from client relationship in backend
  clientId: string;
  capacityKwp: number;
  inverterCapacity: number;
  moduleCount: number;
  manufacturer: string;
  model: string;
  utility: string; // maps to utilityCompany in backend
  estimatedKwh: number;
  payback: number; // maps to paybackYears in backend
  status: 'ONLINE' | 'ALERT' | 'OFFLINE' | 'CRITICAL';
  gpsLatitude?: number;
  gpsLongitude?: number;
  datalogger?: string;
  address?: string;
  city?: string;
  state?: string;
  minEnergyPeak?: number;
  maxEnergyPeak?: number;
  installationDate?: string;
  approvalDate?: string;
}

interface AppContextType {
  clients: Client[];
  addClient: (client: Omit<Client, 'id' | 'status' | 'gpsLatitude' | 'gpsLongitude'>) => Promise<void>;
  updateClient: (id: string, client: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  usinas: Usina[];
  addUsina: (usina: Omit<Usina, 'id' | 'status'>) => Promise<void>;
  updateUsina: (id: string, usina: Partial<Usina>) => Promise<void>;
  deleteUsina: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
  addTicket: (ticket: { clientId: string; category: string; title: string; description: string }) => Promise<any>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [usinas, setUsinas] = useState<Usina[]>([]);

  const getHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'x-user-role': localStorage.getItem('user_role') || '',
      'x-user-email': localStorage.getItem('user_email') || '',
    };
  };

  const fetchClients = async () => {
    try {
      const response = await fetch(`${API_URL}/clients`, {
        headers: getHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        const formatted = data.map((c: any) => ({
          ...c,
          gpsLatitude: c.gpsLatitude !== null && c.gpsLatitude !== undefined ? Number(c.gpsLatitude) : -23.5505,
          gpsLongitude: c.gpsLongitude !== null && c.gpsLongitude !== undefined ? Number(c.gpsLongitude) : -46.6333,
        }));
        setClients(formatted);
      }
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    }
  };

  const fetchUsinas = async () => {
    try {
      const response = await fetch(`${API_URL}/usinas`, {
        headers: getHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        const formatted = data.map((u: any) => ({
          ...u,
          client: u.client?.name || 'Cliente Desconhecido',
          utility: u.utilityCompany || '',
          payback: u.paybackYears || 0,
          gpsLatitude: u.gpsLatitude !== null && u.gpsLatitude !== undefined ? Number(u.gpsLatitude) : -23.5505,
          gpsLongitude: u.gpsLongitude !== null && u.gpsLongitude !== undefined ? Number(u.gpsLongitude) : -46.6333,
        }));
        setUsinas(formatted);
      }
    } catch (err) {
      console.error('Failed to fetch usinas:', err);
    }
  };

  const refreshData = async () => {
    await Promise.all([fetchClients(), fetchUsinas()]);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const getCoordinates = async (city: string, state: string, addressLine?: string): Promise<{ lat: number; lon: number }> => {
    let lat = -23.5505;
    let lon = -46.6333;

    try {
      let query = `${city}, ${state}, Brasil`;
      if (addressLine) {
        query = `${addressLine}, ${city}, ${state}, Brasil`;
      }
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        lat = parseFloat(data[0].lat);
        lon = parseFloat(data[0].lon);
      }
    } catch (error) {
      console.error("Falha ao obter coordenadas do endereço:", error);
    }
    return { lat, lon };
  };

  const addClient = async (clientData: Omit<Client, 'id' | 'status' | 'gpsLatitude' | 'gpsLongitude'>) => {
    const coords = await getCoordinates(clientData.city, clientData.state);

    try {
      const response = await fetch(`${API_URL}/clients`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          ...clientData,
          gpsLatitude: coords.lat,
          gpsLongitude: coords.lon,
          status: 'ACTIVE',
        }),
      });

      if (response.ok) {
        await fetchClients();
      } else {
        console.error('Server failed to create client:', response.statusText);
      }
    } catch (err) {
      console.error('Failed to create client:', err);
    }
  };

  const updateClient = async (id: string, clientData: Partial<Client>) => {
    let coords: { lat?: number; lon?: number } = {};
    if (clientData.city && clientData.state) {
      coords = await getCoordinates(clientData.city, clientData.state);
    }

    try {
      const response = await fetch(`${API_URL}/clients/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          ...clientData,
          ...(coords.lat ? { gpsLatitude: coords.lat, gpsLongitude: coords.lon } : {}),
        }),
      });

      if (response.ok) {
        await fetchClients();
      }
    } catch (err) {
      console.error('Failed to update client:', err);
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/clients/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (response.ok) {
        await refreshData();
      }
    } catch (err) {
      console.error('Failed to delete client:', err);
    }
  };

  const addUsina = async (usinaData: Omit<Usina, 'id' | 'status'>) => {
    let lat = -23.5505;
    let lon = -46.6333;

    if (usinaData.city && usinaData.state) {
      const coords = await getCoordinates(usinaData.city, usinaData.state, usinaData.address);
      lat = coords.lat;
      lon = coords.lon;
    } else {
      const clientObj = clients.find(c => c.id === usinaData.clientId);
      if (clientObj) {
        lat = clientObj.gpsLatitude || -23.5505;
        lon = clientObj.gpsLongitude || -46.6333;
      }
    }

    try {
      const response = await fetch(`${API_URL}/usinas`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          ...usinaData,
          utilityCompany: usinaData.utility,
          paybackYears: usinaData.payback,
          gpsLatitude: lat,
          gpsLongitude: lon,
          status: 'ONLINE',
        }),
      });

      if (response.ok) {
        await fetchUsinas();
      }
    } catch (err) {
      console.error('Failed to create usina:', err);
    }
  };

  const updateUsina = async (id: string, usinaData: Partial<Usina>) => {
    let lat = usinaData.gpsLatitude;
    let lon = usinaData.gpsLongitude;

    if (usinaData.city && usinaData.state && (usinaData.address || usinaData.city)) {
      const coords = await getCoordinates(usinaData.city, usinaData.state, usinaData.address);
      lat = coords.lat;
      lon = coords.lon;
    }

    try {
      const response = await fetch(`${API_URL}/usinas/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          ...usinaData,
          utilityCompany: usinaData.utility,
          paybackYears: usinaData.payback,
          ...(lat !== undefined ? { gpsLatitude: lat, gpsLongitude: lon } : {}),
        }),
      });

      if (response.ok) {
        await fetchUsinas();
      }
    } catch (err) {
      console.error('Failed to update usina:', err);
    }
  };

  const deleteUsina = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/usinas/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (response.ok) {
        await fetchUsinas();
      }
    } catch (err) {
      console.error('Failed to delete usina:', err);
    }
  };

  const addTicket = async (ticketData: { clientId: string; category: string; title: string; description: string }) => {
    try {
      const response = await fetch(`${API_URL}/tickets`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(ticketData),
      });
      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to create ticket on server');
    } catch (err) {
      console.error('Failed to create ticket:', err);
      throw err;
    }
  };

  return (
    <AppContext.Provider value={{ clients, addClient, updateClient, deleteClient, usinas, addUsina, updateUsina, deleteUsina, refreshData, addTicket }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
