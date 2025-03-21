import { useState, useEffect } from 'react';
import { Tree } from 'primereact/tree';
import axios from 'axios';
import { Button } from 'primereact/button';
import StructureForm from '../form/StructureForm';
import 'primeicons/primeicons.css';

export default function BasicDemo() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  const fetchTasks = () => {
    setLoading(true);
    axios
      .get('http://localhost:5006/structure?type=BUILD')
      .then((response) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const treeData = response.data.map((item: any) => ({
          label: renderNodeLabel(
            item.coname,
            () => setSelectedTask({ parentId: item.id, type: 'FLOOR' }),
            () => handleDelete('BUILD', item.id),
            () =>
              setSelectedTask({
                id: item.id,
                coname: item.coname,
                type: 'BUILD',
              }),
          ),
          data: item.id,
          leaf: !item.hasFloor,
          key: 'Build' + item.no,
          type: 'Build',
        }));
        setNodes(treeData);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching tree data:', error);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleNodeSelect = (e: any) => {
    setLoading(true);
    const selectedNode = e.node;

    if (selectedNode.type === 'Build') {
      axios
        .get(
          `http://localhost:5006/structure?type=FLOOR&id=${selectedNode.data}`,
        )
        .then((response) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const treeData = response.data.map((item: any) => ({
            label: renderNodeLabel(
              item.coname,
              () => setSelectedTask({ parentId: item.id, type: 'SPACE' }),
              () => handleDelete('FLOOR', item.id),
              () =>
                setSelectedTask({
                  id: item.id,
                  coname: item.coname,
                  type: 'FLOOR',
                }),
            ),
            data: item.id,
            leaf: !item.hasSpace,
            key: 'Floor' + item.no,
            type: 'Floor',
          }));
          selectedNode.children = treeData;
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching FLOORs:', error);
          setLoading(false);
        });
    } else if (selectedNode.type === 'Floor') {
      axios
        .get(
          `http://localhost:5006/structure?type=SPACE&id=${selectedNode.data}`,
        )
        .then((response) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const treeData = response.data.map((item: any) => ({
            label: renderNodeLabel(
              item.coname,
              undefined,
              () => handleDelete('SPACE', item.id),
              () =>
                setSelectedTask({
                  id: item.id,
                  coname: item.coname,
                  type: 'SPACE',
                }),
            ),
            data: item.id,
            leaf: true,
            key: 'Space' + item.no,
            type: 'Space',
          }));
          selectedNode.children = treeData;
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching SPACEs:', error);
          setLoading(false);
        });
    }
  };

  const handleDelete = async (type: string, id: number) => {
    try {
      await axios.delete(
        `http://localhost:5006/structure?type=${type}&id=${id}`,
      );
      fetchTasks();
    } catch (error) {
      console.error('Silme sırasında hata:', error);
    }
  };

  const renderNodeLabel = (
    title: string,
    onAdd?: () => void,
    onDelete?: () => void,
    onUpdate?: () => void,
  ) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minWidth: '1370px',
      }}
    >
      <span
        style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {title}
      </span>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {onAdd && (
          <Button
            icon="pi pi-plus"
            className="p-button-sm p-0"
            style={buttonStyle}
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
              setFormVisible(true);
            }}
          />
        )}
        {onUpdate && (
          <Button
            icon="pi pi-pencil"
            className="p-button-sm p-0"
            style={{ ...buttonStyle, color: 'gray' }}
            onClick={(e) => {
              e.stopPropagation();
              onUpdate();
              setFormVisible(true);
            }}
          />
        )}
        {onDelete && (
          <Button
            icon="pi pi-minus"
            className="p-button-sm p-0"
            style={{ ...buttonStyle, color: 'red' }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          />
        )}
      </div>
    </div>
  );

  const buttonStyle = {
    background: 'transparent',
    border: 'none',
    boxShadow: 'none',
    width: '1.25rem',
    height: '1.25rem',
    flexShrink: 0,
    color: 'black',
  };

  return (
    <div className="card flex justify-content-center">
      <Button
        label="Yeni Task Ekle"
        icon="pi pi-plus"
        onClick={() => {
          setSelectedTask(null);
          setFormVisible(true);
        }}
      />
      <StructureForm
        task={selectedTask}
        visible={formVisible}
        onHide={() => setFormVisible(false)}
        onTaskSaved={() => {
          setFormVisible(false);
          fetchTasks();
        }}
      />
      <Tree
        value={nodes}
        className="w-full md:w-30rem"
        selectionMode="single"
        onExpand={handleNodeSelect}
        loading={loading}
      />
    </div>
  );
}
