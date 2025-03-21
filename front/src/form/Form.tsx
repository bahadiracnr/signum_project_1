import { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import axios from 'axios';
import './Form.css';

interface FormProps {
  onTaskSaved: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  task?: any;
  visible: boolean;
  onHide: () => void;
}

export default function Form({
  onTaskSaved,
  task,
  visible,
  onHide,
}: FormProps) {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    status: 'TODO',
    description: '',
  });

  useEffect(() => {
    if (task) {
      setFormData({
        name: task.name || '',
        location: task.location || '',
        status: task.status || 'TODO',
        description: task.description || '',
      });
    } else {
      setFormData({ name: '', location: '', status: 'TODO', description: '' });
    }
  }, [task]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (task && task.id !== undefined) {
        await axios.put(`http://localhost:5005/task/${task.id}`, formData);
      } else {
        await axios.post('http://localhost:5005/task', formData);
      }
      onTaskSaved();
      onHide();
    } catch (error) {
      console.error('Gönderim sırasında hata oluştu', error);
    }
  };

  return (
    <Dialog
      header={task ? 'Task Güncelle' : 'Yeni Task'}
      visible={visible}
      style={{ width: '50vw' }}
      onHide={onHide}
      breakpoints={{ '960px': '95vw' }}
    >
      <div className="form-container">
        <form onSubmit={handleSubmit}>
          <label htmlFor="name">Name:</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />

          <label htmlFor="location">Location:</label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            required
          />

          <label htmlFor="status">Status:</label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
          >
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
          </select>

          <label htmlFor="description">Description:</label>
          <textarea
            id="description"
            name="description"
            rows={4}
            value={formData.description}
            onChange={handleChange}
          ></textarea>

          <button type="submit">{task ? 'Güncelle' : 'Kaydet'}</button>
        </form>
      </div>
    </Dialog>
  );
}
