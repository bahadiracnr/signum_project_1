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
          label: (
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
                {item.coname}
              </span>
              <Button
                icon="pi pi-plus"
                className="p-button-sm p-0"
                style={{
                  background: 'transparent',
                  border: 'none',
                  boxShadow: 'none',
                  color: 'black',
                  width: '1.25rem',
                  height: '1.25rem',
                  flexShrink: 0,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTask({ parentId: item.id, type: 'FLOOR' });
                  setFormVisible(true);
                }}
                aria-label="Alt birim ekle"
              />
            </div>
          ),

          data: item.id,
          leaf: item.hasFloor === true ? false : true,
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
            label: (
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
                  {item.coname}
                </span>
                <Button
                  icon="pi pi-plus"
                  className="p-button-sm p-0"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    boxShadow: 'none',
                    color: 'black',
                    width: '1.25rem',
                    height: '1.25rem',
                    flexShrink: 0,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTask({ parentId: item.id, type: 'SPACE' });
                    setFormVisible(true);
                  }}
                  aria-label="Alt birim ekle"
                />
              </div>
            ),
            data: item.id,
            leaf: item.hasSpace === true ? false : true,
            key: 'Floor' + item.no,
            type: 'Floor',
          }));
          selectedNode.children = treeData;
          // setNodes((prev) => [...prev]);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching tree data:', error);
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
            label: item.coname,
            data: item.id,
            leaf: true,
            key: 'Space' + item.no,
            type: 'Space',
          }));
          selectedNode.children = treeData;
          // setNodes((prev) => [...prev]);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching tree data:', error);
          setLoading(false);
        });
    }
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
