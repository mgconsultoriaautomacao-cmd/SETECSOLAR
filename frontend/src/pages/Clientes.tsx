import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useApp, type Client } from '../context/AppContext';

export default function Clientes() {
  const { clients, addClient, updateClient, deleteClient } = useApp();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  const [clientForm, setClientForm] = useState({
    name: '',
    document: '',
    phone: '',
    email: '',
    city: '',
    state: '',
    installationDate: new Date().toISOString().split('T')[0],
  });

  const [openDelete, setOpenDelete] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleOpen = () => {
    setEditingClient(null);
    setClientForm({
      name: '',
      document: '',
      phone: '',
      email: '',
      city: '',
      state: '',
      installationDate: new Date().toISOString().split('T')[0],
    });
    setOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setClientForm({
      name: client.name,
      document: client.document,
      phone: client.phone,
      email: client.email,
      city: client.city,
      state: client.state,
      installationDate: client.installationDate ? new Date(client.installationDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    });
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleSave = async () => {
    if (editingClient) {
      await updateClient(editingClient.id, clientForm);
    } else {
      await addClient(clientForm);
    }
    handleClose();
  };

  const handleOpenDelete = (id: string) => {
    setDeleteId(id);
    setOpenDelete(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteId) {
      await deleteClient(deleteId);
      setOpenDelete(false);
      setDeleteId(null);
    }
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.document.includes(search)
  );

  return (
    <Box className="space-y-6">
      <Box className="flex justify-between items-center">
        <Typography variant="h5" className="font-bold text-slate-100">
          Gestão de Clientes
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpen}
        >
          Novo Cliente
        </Button>
      </Box>

      {/* Busca e filtros */}
      <Paper className="p-4 bg-slate-900 border border-slate-800 flex items-center justify-between">
        <TextField
          placeholder="Buscar por nome ou CPF/CNPJ..."
          variant="outlined"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 350 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon className="text-slate-400" />
                </InputAdornment>
              ),
            }
          }}
        />
      </Paper>

      {/* Tabela de Clientes */}
      <TableContainer component={Paper} className="bg-slate-900 border border-slate-800">
        <Table>
          <TableHead className="bg-slate-950">
            <TableRow>
              <TableCell className="text-slate-300 font-bold">Nome</TableCell>
              <TableCell className="text-slate-300 font-bold">Documento</TableCell>
              <TableCell className="text-slate-300 font-bold">Contato</TableCell>
              <TableCell className="text-slate-300 font-bold">Cidade/UF</TableCell>
              <TableCell className="text-slate-300 font-bold">Instalação</TableCell>
              <TableCell className="text-slate-300 font-bold">Status</TableCell>
              <TableCell className="text-slate-300 font-bold" align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredClients.map((client) => (
              <TableRow key={client.id} className="hover:bg-slate-850/50">
                <TableCell className="text-slate-100">{client.name}</TableCell>
                <TableCell className="text-slate-300">{client.document}</TableCell>
                <TableCell className="text-slate-300">
                  <Box className="flex flex-col">
                    <span>{client.email}</span>
                    <span className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
                      <WhatsAppIcon className="text-green-500" sx={{ fontSize: 14 }} /> {client.phone}
                    </span>
                  </Box>
                </TableCell>
                <TableCell className="text-slate-300">{client.city} - {client.state}</TableCell>
                <TableCell className="text-slate-300">
                  {client.installationDate ? new Date(client.installationDate).toLocaleDateString('pt-BR') : 'N/A'}
                </TableCell>
                <TableCell>
                  <Chip
                    label={client.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                    color={client.status === 'ACTIVE' ? 'success' : 'default'}
                    size="small"
                    className="font-semibold"
                  />
                </TableCell>
                <TableCell align="center">
                  <Box className="flex justify-center gap-2">
                    <IconButton size="small" color="primary" onClick={() => handleOpenEdit(client)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleOpenDelete(client.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {filteredClients.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" className="text-slate-400 py-6">
                  Nenhum cliente cadastrado ou encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal Novo/Editar Cliente */}
      <Dialog open={open} onClose={handleClose} slotProps={{ paper: { sx: { bgcolor: '#1e293b', color: '#f8fafc', maxWidth: 600, width: '100%' } } }}>
        <DialogTitle className="font-bold border-b border-slate-800">
          {editingClient ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
        </DialogTitle>
        <DialogContent className="pt-6 space-y-4">
          <Grid container spacing={2} className="mt-2">
            <Grid size={12}>
              <TextField
                label="Nome do Cliente"
                fullWidth
                value={clientForm.name}
                onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="CPF ou CNPJ"
                fullWidth
                value={clientForm.document}
                onChange={(e) => setClientForm({ ...clientForm, document: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Telefone / WhatsApp"
                fullWidth
                value={clientForm.phone}
                onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="E-mail"
                fullWidth
                value={clientForm.email}
                onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                label="Cidade"
                fullWidth
                value={clientForm.city}
                onChange={(e) => setClientForm({ ...clientForm, city: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Estado (UF)"
                fullWidth
                value={clientForm.state}
                onChange={(e) => setClientForm({ ...clientForm, state: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Data de Instalação"
                type="date"
                fullWidth
                value={clientForm.installationDate}
                onChange={(e) => setClientForm({ ...clientForm, installationDate: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions className="border-t border-slate-800 p-4">
          <Button onClick={handleClose} color="inherit">Cancelar</Button>
          <Button onClick={handleSave} variant="contained" color="primary">Salvar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal Confirmação de Exclusão */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)} slotProps={{ paper: { sx: { bgcolor: '#1e293b', color: '#f8fafc' } } }}>
        <DialogTitle className="font-bold">Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography className="text-slate-300">
            Tem certeza que deseja excluir este cliente? Todas as suas usinas e faturas vinculadas serão removidas do sistema.
          </Typography>
        </DialogContent>
        <DialogActions className="p-4">
          <Button onClick={() => setOpenDelete(false)} color="inherit">Cancelar</Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error">Excluir</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
