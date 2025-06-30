import React, { useState, useEffect } from 'react';
import DropDownPicker from 'react-native-dropdown-picker';

const BusquedaClientes = () => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    // Suponiendo que clientes es un array de objetos con id y nombre
    fetch('https://toolshop.cloud/Badger/controlador/backMovil/clientes.php')
      .then(res => res.json())
      .then(data => {
        const opciones = data.map(c => ({ label: c.nombre, value: c.id }));
        setItems(opciones);
      });
  }, []);

  return (
    <DropDownPicker
      open={open}
      value={value}
      items={items}
      setOpen={setOpen}
      setValue={setValue}
      setItems={setItems}
      searchable={true}
      placeholder="Selecciona un cliente"
      searchPlaceholder="Buscar cliente..."
      zIndex={3000}
      zIndexInverse={1000}
    />
  );
};
