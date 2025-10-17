import { ReactDiagram } from 'gojs-react';
import * as go from 'gojs';
import type { User } from '@shared/schema';
import { useMemo } from 'react';

interface GoJSOrgNodeData {
  key: string;
  parent?: string;
  name: string;
  title: string;
  email: string;
  role: string;
  color: string;
  directReports: number;
}

interface GoJSOrgProps {
  users: User[];
  onViewDetails?: (userId: string) => void;
  onAddEmployee?: (parentUserId: string) => void;
  onRemoveFromChart?: (userId: string) => void;
}

export default function GoJSOrganogram({ users, onViewDetails, onAddEmployee, onRemoveFromChart }: GoJSOrgProps) {
  
  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Admin',
      hr: 'HR Manager',
      contact_center_ops_manager: 'CC Ops Manager',
      contact_center_manager: 'CC Manager',
      team_leader: 'Team Leader',
      agent: 'Agent'
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: '#9333ea', // purple
      hr: '#3b82f6', // blue
      contact_center_ops_manager: '#10b981', // green
      contact_center_manager: '#f97316', // orange
      team_leader: '#eab308', // yellow
      agent: '#ec4899' // pink
    };
    return colors[role] || colors.agent;
  };

  // Transform users to GoJS node data
  const nodeDataArray = useMemo(() => {
    const nodes: GoJSOrgNodeData[] = users
      .filter(u => u.isActive)
      .map(user => {
        const directReports = users.filter(u => u.reportsTo === user.id && u.isActive).length;
        return {
          key: user.id,
          parent: user.reportsTo || undefined,
          name: `${user.firstName} ${user.lastName}`,
          title: getRoleLabel(user.role),
          email: user.email || '',
          role: user.role,
          color: getRoleColor(user.role),
          directReports
        };
      });
    return nodes;
  }, [users]);

  const initDiagram = () => {
    const $ = go.GraphObject.make;

    const diagram = $(go.Diagram, {
      'undoManager.isEnabled': true,
      layout: $(go.TreeLayout, {
        treeStyle: go.TreeStyle.LastParents,
        arrangement: go.TreeArrangement.Horizontal,
        angle: 90,
        layerSpacing: 35,
        alternateAngle: 90,
        alternateLayerSpacing: 35,
        alternateAlignment: go.TreeAlignment.Bus,
        alternateNodeSpacing: 20
      }),
      model: new go.TreeModel(),
      'toolManager.hoverDelay': 100,
      allowZoom: true,
      allowHorizontalScroll: true,
      allowVerticalScroll: true,
      'commandHandler.deletesTree': true
    });

    // Node template with avatar, name, role, and direct reports
    diagram.nodeTemplate = $(
      go.Node,
      'Auto',
      {
        locationSpot: go.Spot.Center,
        isShadowed: true,
        shadowOffset: new go.Point(0, 2),
        shadowBlur: 8,
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        movable: true,
        selectable: true,
      },
      new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
      $(
        go.Shape,
        'RoundedRectangle',
        {
          strokeWidth: 2,
          fill: 'white',
          portId: '',
          cursor: 'pointer',
          fromLinkable: true,
          fromLinkableSelfNode: false,
          fromLinkableDuplicates: false,
          toLinkable: true,
          toLinkableSelfNode: false,
          toLinkableDuplicates: false
        },
        new go.Binding('fill', 'color', (c) => {
          // Create a light gradient based on the role color
          const lightColor = go.Brush.lighten(c);
          return lightColor;
        }),
        new go.Binding('stroke', 'color')
      ),
      $(
        go.Panel,
        'Vertical',
        { margin: 12 },
        // Avatar section
        $(
          go.Panel,
          'Horizontal',
          { margin: new go.Margin(0, 0, 8, 0) },
          $(
            go.Shape,
            'Circle',
            {
              width: 40,
              height: 40,
              fill: 'white',
              stroke: '#e5e7eb',
              strokeWidth: 2
            }
          ),
          $(
            go.TextBlock,
            {
              margin: new go.Margin(0, 0, 0, -40),
              font: 'bold 16px sans-serif',
              stroke: '#374151'
            },
            new go.Binding('text', '', (data) => {
              const names = data.name.split(' ');
              const initials = names.map((n: string) => n[0]).join('');
              return initials.substring(0, 2).toUpperCase();
            })
          )
        ),
        // Name
        $(
          go.TextBlock,
          {
            font: 'bold 14px sans-serif',
            stroke: '#111827',
            margin: new go.Margin(4, 0, 2, 0),
            maxSize: new go.Size(180, NaN),
            wrap: go.Wrap.None,
            overflow: go.TextOverflow.Ellipsis,
            textAlign: 'center'
          },
          new go.Binding('text', 'name')
        ),
        // Role/Title
        $(
          go.TextBlock,
          {
            font: '12px sans-serif',
            stroke: '#6b7280',
            margin: new go.Margin(0, 0, 4, 0),
            maxSize: new go.Size(180, NaN),
            wrap: go.Wrap.None,
            overflow: go.TextOverflow.Ellipsis,
            textAlign: 'center'
          },
          new go.Binding('text', 'title')
        ),
        // Email
        $(
          go.TextBlock,
          {
            font: '11px sans-serif',
            stroke: '#9ca3af',
            margin: new go.Margin(0, 0, 8, 0),
            maxSize: new go.Size(180, NaN),
            wrap: go.Wrap.None,
            overflow: go.TextOverflow.Ellipsis,
            textAlign: 'center'
          },
          new go.Binding('text', 'email')
        ),
        // Direct reports (only show if > 0)
        $(
          go.Panel,
          'Auto',
          {
            visible: false
          },
          new go.Binding('visible', 'directReports', (count) => count > 0),
          $(
            go.Shape,
            'RoundedRectangle',
            {
              fill: '#f3f4f6',
              stroke: null
            }
          ),
          $(
            go.TextBlock,
            {
              font: '11px sans-serif',
              stroke: '#374151',
              margin: 6,
              textAlign: 'center'
            },
            new go.Binding('text', 'directReports', (count) => 
              `${count} Direct Report${count > 1 ? 's' : ''}`
            )
          )
        )
      ),
      // Context menu
      {
        contextMenu: $(
          'ContextMenu',
          $('ContextMenuButton',
            $(go.TextBlock, 'View Details', { 
              margin: 4,
              font: '13px sans-serif'
            }),
            {
              click: (e, obj) => {
                const contextMenu = obj.part as go.Adornment;
                const node = contextMenu?.adornedPart;
                if (node && node.data) {
                  onViewDetails?.(node.data.key);
                }
              }
            }
          ),
          $('ContextMenuButton',
            $(go.TextBlock, 'Add Employee', { 
              margin: 4,
              font: '13px sans-serif'
            }),
            {
              click: (e, obj) => {
                const contextMenu = obj.part as go.Adornment;
                const node = contextMenu?.adornedPart;
                if (node && node.data) {
                  onAddEmployee?.(node.data.key);
                }
              }
            }
          ),
          $('ContextMenuButton',
            $(go.TextBlock, 'Remove from Chart', { 
              margin: 4,
              font: '13px sans-serif'
            }),
            {
              click: (e, obj) => {
                const contextMenu = obj.part as go.Adornment;
                const node = contextMenu?.adornedPart;
                if (node && node.data) {
                  onRemoveFromChart?.(node.data.key);
                }
              }
            }
          )
        )
      }
    );

    // Link template
    diagram.linkTemplate = $(
      go.Link,
      go.Link.Orthogonal,
      { 
        routing: go.Routing.Orthogonal,
        corner: 5,
        layerName: 'Background',
        selectable: false
      },
      $(go.Shape, { 
        strokeWidth: 1.5, 
        stroke: '#cbd5e1' 
      })
    );

    // Enable drag and drop to reorganize
    diagram.toolManager.linkingTool.archetypeLinkData = {};
    diagram.toolManager.linkingTool.isUnconnectedLinkValid = false;

    // Custom validation for linking
    diagram.toolManager.linkingTool.linkValidation = (fromnode, fromport, tonode, toport) => {
      // Check for null nodes
      if (!fromnode || !tonode) return false;
      
      // Prevent linking to self
      if (fromnode === tonode) return false;
      
      // Prevent cycles
      if (tonode.findTreeParentNode() === fromnode) return false;
      
      return true;
    };

    // Handle link creation (reorganization)
    diagram.addDiagramListener('LinkDrawn', (e) => {
      const link = e.subject;
      if (link && link.data) {
        const toNode = link.toNode;
        const fromNode = link.fromNode;
        if (toNode && fromNode) {
          // Update the parent relationship
          diagram.model.setDataProperty(toNode.data, 'parent', fromNode.data.key);
        }
      }
    });

    return diagram;
  };

  const handleModelChange = (changes: go.IncrementalData) => {
    // Handle model changes if needed
    console.log('Model changed:', changes);
  };

  return (
    <div className="w-full h-[600px] border rounded-lg bg-white dark:bg-gray-900" data-testid="gojs-organogram">
      <ReactDiagram
        initDiagram={initDiagram}
        divClassName="w-full h-full"
        nodeDataArray={nodeDataArray}
        onModelChange={handleModelChange}
      />
    </div>
  );
}
