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
  phone: string;
  dept: string;
  role: string;
}

interface GoJSOrgProps {
  users: User[];
  onViewDetails?: (userId: string) => void;
  onAddEmployee?: (parentUserId: string) => void;
  onRemoveFromChart?: (userId: string) => void;
}

export default function GoJSOrganogram({ users, onViewDetails, onAddEmployee, onRemoveFromChart }: GoJSOrgProps) {
  
  // Set GoJS license key if available (removes evaluation watermark)
  // Add your license key as VITE_GOJS_LICENSE_KEY environment variable
  if (import.meta.env.VITE_GOJS_LICENSE_KEY) {
    (go.Diagram as any).licenseKey = import.meta.env.VITE_GOJS_LICENSE_KEY;
  }
  
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

  // Transform users to GoJS node data
  const nodeDataArray = useMemo(() => {
    const nodes: GoJSOrgNodeData[] = users
      .filter(u => u.isActive)
      .map(user => {
        return {
          key: user.id,
          parent: user.reportsTo || undefined,
          name: `${user.firstName} ${user.lastName}`,
          title: getRoleLabel(user.role),
          email: user.email || 'No email',
          phone: 'No phone',
          dept: getRoleLabel(user.role),
          role: user.role
        };
      });
    return nodes;
  }, [users]);

  const initDiagram = () => {
    const $ = go.GraphObject.make;

    const diagram = $(go.Diagram, {
      allowCopy: false,
      allowDelete: false,
      initialAutoScale: go.AutoScale.UniformToFill,
      maxSelectionCount: 1,
      validCycle: go.CycleMode.DestinationTree,
      padding: new go.Margin(90, 20, 20, 300),
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
      'undoManager.isEnabled': true,
      'themeManager.changesDivBackground': true,
      'themeManager.currentTheme': 'light',
      model: new go.TreeModel()
    });

    // Set up themes
    diagram.themeManager.set('light', {
      colors: {
        background: '#fff',
        text: '#111827',
        textHighlight: '#11a8cd',
        subtext: '#6b7280',
        badge: '#f0fdf4',
        badgeBorder: '#16a34a33',
        badgeText: '#15803d',
        divider: '#6b7280',
        shadow: '#9ca3af',
        tooltip: '#1f2937',
        levels: [
          '#AC193D',
          '#2672EC',
          '#8C0095',
          '#5133AB',
          '#008299',
          '#D24726',
          '#008A00',
          '#094AB2'
        ],
        dragOver: '#f0f9ff',
        link: '#9ca3af',
        div: '#f3f4f6'
      },
      fonts: {
        name: '500 0.875rem Inter, sans-serif',
        normal: '0.875rem Inter, sans-serif',
        badge: '500 0.75rem Inter, sans-serif',
        link: '600 0.875rem Inter, sans-serif'
      }
    });

    diagram.themeManager.set('dark', {
      colors: {
        background: '#111827',
        text: '#fff',
        subtext: '#d1d5db',
        badge: '#22c55e19',
        badgeBorder: '#22c55e21',
        badgeText: '#4ade80',
        shadow: '#111827',
        dragOver: '#082f49',
        link: '#6b7280',
        div: '#1f2937'
      }
    });

    // Validation function
    function mayWorkFor(node1: go.Node | null, node2: go.Node | null) {
      if (!(node1 instanceof go.Node)) return false;
      if (node1 === node2) return false;
      if (node2 && node2.isInTreeOf(node1)) return false;
      return true;
    }

    // Tooltip text converter
    function toolTipTextConverter(obj: go.GraphObject | null) {
      if (!obj) return '';
      if (obj.name === 'EMAIL') return obj.part?.data.email || '';
      if (obj.name === 'PHONE') return obj.part?.data.phone || '';
      if (obj.name === 'BUTTON') return 'Add employee';
      if (obj.name === 'BUTTONX') return (obj.part as go.Node)?.isTreeExpanded ? 'Collapse tree' : 'Expand tree';
      return '';
    }

    // Tooltip alignment converter
    function toolTipAlignConverter(obj: go.GraphObject, tt: go.Adornment) {
      const d = obj.diagram;
      if (!d) return;
      const bot = obj.getDocumentPoint(go.Spot.Bottom);
      const viewPt = d.transformDocToView(bot).offset(0, 35);
      const align = d.viewportBounds.height >= viewPt.y / d.scale
        ? new go.Spot(0.5, 1, 0, 6)
        : new go.Spot(0.5, 0, 0, -6);
      
      tt.alignment = align;
      tt.alignmentFocus = align.y === 1 ? go.Spot.Top : go.Spot.Bottom;
    }

    // Tooltip adornment
    const toolTip = $(go.Adornment, go.Panel.Spot, {
        isShadowed: true,
        shadowOffset: new go.Point(0, 2)
      },
      $(go.Placeholder),
      $(go.Panel, go.Panel.Auto,
        $(go.Shape, 'RoundedRectangle', { 
          strokeWidth: 0, 
          shadowVisible: true,
          fill: '#fff'
        })
          .theme('fill', 'background'),
        $(go.TextBlock, { margin: 4 })
          .bindObject('text', 'adornedObject', toolTipTextConverter)
          .theme('stroke', 'text')
          .theme('font', 'normal')
      )
        .bindObject('', 'adornedObject', toolTipAlignConverter)
    )
      .theme('shadowColor', 'shadow');

    // Used to convert the node's tree level into a theme color
    function findLevelColor(node: go.Node) {
      return node.findTreeLevel();
    }

    // Bottom button maker
    function makeBottomButton(name: string) {
      const phonePath = 'F M2 3.5A1.5 1.5 0 013.5 2h1.148a1.5 1.5 0 011.465 1.175l.716 3.223a1.5 1.5 0 01-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 006.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 011.767-1.052l3.223.716A1.5 1.5 0 0118 15.352V16.5a1.5 1.5 0 01-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 012.43 8.326 13.019 13.019 0 012 5V3.5z';
      const emailPath = 'F M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3zM19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z';
      const isEmail = name === 'EMAIL';
      
      return $(go.Panel, go.Panel.Table, {
          name,
          background: 'transparent',
          cursor: 'pointer',
          column: isEmail ? 0 : 1,
          width: 140,
          height: 40,
          toolTip: toolTip,
          mouseEnter: (e: go.InputEvent, pnl: go.GraphObject) => {
            if (!(pnl instanceof go.Panel)) return;
            const overbrush = e.diagram?.themeManager.findValue('textHighlight', 'colors') || 'skyblue';
            const panel = pnl.elements.first();
            if (panel instanceof go.Panel) {
              const iter = panel.elements;
              let count = 0;
              let shape: go.GraphObject | null = null;
              let text: go.GraphObject | null = null;
              while (iter.next()) {
                if (count === 0) shape = iter.value;
                if (count === 1) text = iter.value;
                count++;
              }
              iter.reset();
              if (shape instanceof go.Shape) {
                (pnl as any)._oldBrush = shape.fill;
                shape.fill = overbrush;
              }
              if (text instanceof go.TextBlock) {
                text.stroke = overbrush;
              }
            }
          },
          mouseLeave: (e: go.InputEvent, pnl: go.GraphObject) => {
            if (!(pnl instanceof go.Panel)) return;
            const panel = pnl.elements.first();
            if (panel instanceof go.Panel && (pnl as any)._oldBrush) {
              const iter = panel.elements;
              let count = 0;
              let shape: go.GraphObject | null = null;
              let text: go.GraphObject | null = null;
              while (iter.next()) {
                if (count === 0) shape = iter.value;
                if (count === 1) text = iter.value;
                count++;
              }
              iter.reset();
              if (shape instanceof go.Shape) {
                shape.fill = (pnl as any)._oldBrush;
              }
              if (text instanceof go.TextBlock) {
                text.stroke = (pnl as any)._oldBrush;
              }
            }
          },
          click: (e, obj) => {
            const data = obj.part?.data;
            if (data && onViewDetails) {
              onViewDetails(data.key);
            }
          }
        },
        $(go.Panel, go.Panel.Horizontal,
          $(go.Shape, {
              geometryString: isEmail ? emailPath : phonePath,
              strokeWidth: 0,
              desiredSize: isEmail ? new go.Size(20, 16) : new go.Size(20, 20),
              margin: new go.Margin(0, 12, 0, 0)
            })
            .theme('fill', 'text'),
          $(go.TextBlock, isEmail ? 'Email' : 'Phone')
            .theme('stroke', 'text')
            .theme('font', 'link')
        )
      );
    }

    // Node template
    diagram.nodeTemplate = 
      $(go.Node, go.Panel.Spot, {
          isShadowed: true,
          shadowOffset: new go.Point(0, 2),
          selectionObjectName: 'BODY',
          mouseEnter: (e: go.InputEvent, n: go.GraphObject) => {
            if (!(n instanceof go.Node)) return;
            const button = n.findObject('BUTTON');
            const buttonx = n.findObject('BUTTONX');
            if (button) button.opacity = 1;
            if (buttonx) buttonx.opacity = 1;
          },
          mouseLeave: (e: go.InputEvent, n: go.GraphObject) => {
            if (!(n instanceof go.Node)) return;
            if (n.isSelected) return;
            const button = n.findObject('BUTTON');
            const buttonx = n.findObject('BUTTONX');
            if (button) button.opacity = 0;
            if (buttonx) buttonx.opacity = 0;
          },
          mouseDragEnter: (e: go.InputEvent, n: go.GraphObject, prev: go.GraphObject | null) => {
            if (!(n instanceof go.Node)) return;
            const diagram = n.diagram;
            if (!diagram) return;
            const selnode = diagram.selection.first() as go.Node | null;
            if (!mayWorkFor(selnode, n)) return;
            const shape = n.findObject('SHAPE');
            if (shape && shape instanceof go.Shape) {
              (shape as any)._prevFill = shape.fill;
              shape.fill = diagram.themeManager.findValue('dragOver', 'colors');
            }
          },
          mouseDragLeave: (e: go.InputEvent, n: go.GraphObject, next: go.GraphObject | null) => {
            if (!(n instanceof go.Node)) return;
            const shape = n.findObject('SHAPE');
            if (shape && shape instanceof go.Shape && (shape as any)._prevFill) {
              shape.fill = (shape as any)._prevFill;
            }
          },
          mouseDrop: (e: go.InputEvent, n: go.GraphObject) => {
            if (!(n instanceof go.Node)) return;
            const diagram = n.diagram;
            if (!diagram) return;
            const selnode = diagram.selection.first() as go.Node | null;
            if (mayWorkFor(selnode, n)) {
              const link = selnode?.findTreeParentLink();
              if (link !== null && link) {
                link.fromNode = n;
              } else if (selnode) {
                diagram.toolManager.linkingTool.insertLink(n, n.port, selnode, selnode.port);
              }
            }
          }
        },
        $(go.Panel, go.Panel.Auto, { name: 'BODY' },
          $(go.Shape, 'RoundedRectangle', {
              name: 'SHAPE',
              strokeWidth: 0,
              portId: '',
              spot1: go.Spot.TopLeft,
              spot2: go.Spot.BottomRight
            })
            .theme('fill', 'background'),
          $(go.Panel, go.Panel.Table, { 
              margin: 0.5, 
              defaultRowSeparatorStrokeWidth: 0.5 
            })
            .theme('defaultRowSeparatorStroke', 'divider')
            .addRowDefinition(0, { })
            .addRowDefinition(1, { })
            .add(
              $(go.Panel, go.Panel.Table, { 
                  row: 0,
                  padding: new go.Margin(18, 18, 18, 24) 
                })
                .addColumnDefinition(0, { width: 240 })
                .addColumnDefinition(1, { })
                .add(
                  $(go.Panel, go.Panel.Table, {
                      column: 0,
                      alignment: go.Spot.Left,
                      stretch: go.Stretch.Vertical,
                      defaultAlignment: go.Spot.Left
                    })
                    .addRowDefinition(0, { })
                    .addRowDefinition(1, { })
                    .add(
                      $(go.Panel, go.Panel.Horizontal, { row: 0 },
                        $(go.TextBlock, { 
                            editable: false, 
                            minSize: new go.Size(10, 14) 
                          })
                          .bind('text', 'name')
                          .theme('stroke', 'text')
                          .theme('font', 'name'),
                        $(go.Panel, go.Panel.Auto, { 
                            margin: new go.Margin(0, 0, 0, 10) 
                          },
                          $(go.Shape, 'Capsule', { 
                              parameter1: 6, 
                              parameter2: 6 
                            })
                            .theme('fill', 'badge')
                            .theme('stroke', 'badgeBorder'),
                          $(go.TextBlock, {
                              editable: false,
                              minSize: new go.Size(10, 12),
                              margin: new go.Margin(2, -1)
                            })
                            .bind('text', 'dept')
                            .theme('stroke', 'badgeText')
                            .theme('font', 'badge')
                        )
                      ),
                      $(go.TextBlock, { 
                          row: 1, 
                          editable: false, 
                          minSize: new go.Size(10, 14) 
                        })
                        .bind('text', 'title')
                        .theme('stroke', 'subtext')
                        .theme('font', 'normal')
                    ),
                  $(go.Panel, go.Panel.Spot, { 
                      isClipping: true, 
                      column: 1 
                    },
                    $(go.Shape, 'Circle', { 
                        desiredSize: new go.Size(50, 50), 
                        strokeWidth: 0 
                      }),
                    $(go.TextBlock, {
                        font: 'bold 18px Inter, sans-serif',
                        stroke: '#6b7280'
                      })
                      .bind('text', 'name', (name) => {
                        const names = name.split(' ');
                        const initials = names.map((n: string) => n[0]).join('');
                        return initials.substring(0, 2).toUpperCase();
                      })
                  )
                ),
              $(go.Panel, go.Panel.Table, {
                  row: 1,
                  stretch: go.Stretch.Horizontal,
                  defaultColumnSeparatorStrokeWidth: 0.5
                })
                .theme('defaultColumnSeparatorStroke', 'divider')
                .addColumnDefinition(0, { })
                .addColumnDefinition(1, { })
                .add(makeBottomButton('EMAIL'), makeBottomButton('PHONE'))
            )
        ),
        $(go.Shape, 'RoundedLeftRectangle', {
            alignment: go.Spot.Left,
            alignmentFocus: go.Spot.Left,
            stretch: go.Stretch.Vertical,
            width: 6,
            strokeWidth: 0
          })
          .themeObject('fill', '', 'levels', findLevelColor),
        $('Button', {
            name: 'BUTTON',
            alignment: go.Spot.Right,
            opacity: 0,
            click: (e, button) => {
              const node = button.part;
              if (node && node.data && onAddEmployee) {
                onAddEmployee(node.data.key);
              }
            },
            toolTip: toolTip
          },
          $(go.Shape, 'PlusLine', { 
              width: 8, 
              height: 8, 
              stroke: '#0a0a0a', 
              strokeWidth: 2 
            })
        )
          .bindObject('opacity', 'isSelected', (s) => s ? 1 : 0),
        $('TreeExpanderButton', {
            _treeExpandedFigure: 'LineUp',
            _treeCollapsedFigure: 'LineDown',
            name: 'BUTTONX',
            alignment: go.Spot.Bottom,
            opacity: 0,
            toolTip: toolTip
          })
          .bindObject('opacity', 'isSelected', (s) => s ? 1 : 0)
      )
        .theme('shadowColor', 'shadow')
        .bind('text', 'name')
        .bindObject('layerName', 'isSelected', (sel) => sel ? 'Foreground' : '')
        .bindTwoWay('isTreeExpanded');

    // Context menu
    diagram.nodeTemplate.contextMenu = 
      $('ContextMenu',
        $('ContextMenuButton',
          $(go.TextBlock, 'View Details', { 
              margin: 4,
              font: '13px Inter, sans-serif'
            }),
          {
            click: (e, obj) => {
              const node = (obj.part as go.Adornment)?.adornedPart;
              if (node && node.data && onViewDetails) {
                onViewDetails(node.data.key);
              }
            }
          }
        ),
        $('ContextMenuButton',
          $(go.TextBlock, 'Add Employee', { 
              margin: 4,
              font: '13px Inter, sans-serif'
            }),
          {
            click: (e, obj) => {
              const node = (obj.part as go.Adornment)?.adornedPart;
              if (node && node.data && onAddEmployee) {
                onAddEmployee(node.data.key);
              }
            }
          }
        ),
        $('ContextMenuButton',
          $(go.TextBlock, 'Remove from Chart', { 
              margin: 4,
              font: '13px Inter, sans-serif'
            }),
          {
            click: (e, obj) => {
              const node = (obj.part as go.Adornment)?.adornedPart;
              if (node && node.data && onRemoveFromChart) {
                onRemoveFromChart(node.data.key);
              }
            }
          }
        )
      );

    // Link template
    diagram.linkTemplate = 
      $(go.Link, {
          routing: go.Routing.Orthogonal,
          layerName: 'Background',
          corner: 5
        },
        $(go.Shape, { strokeWidth: 2 })
          .theme('stroke', 'link')
      );

    return diagram;
  };

  const handleModelChange = (changes: go.IncrementalData) => {
    console.log('Model changed:', changes);
  };

  return (
    <div className="w-full h-full bg-white dark:bg-gray-900" data-testid="gojs-organogram">
      <ReactDiagram
        initDiagram={initDiagram}
        divClassName="w-full h-full"
        nodeDataArray={nodeDataArray}
        onModelChange={handleModelChange}
      />
    </div>
  );
}
