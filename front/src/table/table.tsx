import axios from 'axios';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { useState, useEffect } from 'react';
import Form from '../form/Form';

export default function Table() {
  const [data, setData] = useState([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [formVisible, setFormVisible] = useState(false);

  const fetchTasks = () => {
    axios.get('http://localhost:5005/task').then((response) => {
      setData(response.data);
    });
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleDelete = async (taskId: number) => {
    try {
      await axios.delete(`http://localhost:5005/task/${taskId}`);
      fetchTasks();
    } catch (error) {
      console.error('Silme sırasında hata oluştu', error);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actionBodyTemplate = (rowData: any) => {
    return (
      <div className="flex gap-2">
        <Button
          label="Güncelle"
          icon="pi pi-pencil"
          onClick={() => {
            setSelectedTask(rowData);
            setFormVisible(true);
          }}
        />
        <Button
          label="Sil"
          icon="pi pi-trash"
          className="p-button-danger"
          onClick={() => handleDelete(rowData.id)}
        />
      </div>
    );
  };

  return (
    <div className="card">
      <Button
        label="Yeni Task Ekle"
        icon="pi pi-plus"
        onClick={() => {
          setSelectedTask(null);
          setFormVisible(true);
        }}
      />
      <Form
        task={selectedTask}
        visible={formVisible}
        onHide={() => setFormVisible(false)}
        onTaskSaved={fetchTasks}
      />
      <DataTable
        value={data}
        tableStyle={{ minWidth: '50rem', marginTop: '2rem' }}
      >
        <Column field="no" header="TaskNo" />
        <Column field="location" header="Location" />
        <Column field="status" header="Status" />
        <Column field="name" header="Name" />
        <Column field="description" header="Description" />
        <Column body={actionBodyTemplate} header="İşlemler" />
      </DataTable>
    </div>
  );
}
