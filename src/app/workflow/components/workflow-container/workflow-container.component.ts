import {
  Component,
  Input,
  OnInit,
  HostListener,
  ElementRef,
} from '@angular/core';
import {
  WorkflowData,
  WorkflowNode,
  NODE_CONFIG,
} from '../../models/workflow.model';
import { ConnectionComponent } from '../workflow-connection/workflow-connection.component';
import { NodeComponent } from '../workflow-node/workflow-node.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-workflow-container',
  standalone: true,
  imports: [NodeComponent, ConnectionComponent, CommonModule],
  template: `
    <div class="workflow-container">
      <div
        class="workflow-canvas"
        [style.width.px]="canvasWidth"
        [style.height.px]="canvasHeight"
        [style.transform]="getTransform()"
        (mousedown)="onMouseDown($event)"
        (wheel)="onMouseWheel($event)"
      >
        @for (transition of workflowData.transitions; track
        transition.idTransition) {
        <app-workflow-connection [transition]="transition" [nodes]="nodeMap">
        </app-workflow-connection>
        } @for (node of workflowData.nodes; track node.id) {
        <app-workflow-node
          [node]="node"
          [style.left.px]="node.x"
          [style.top.px]="node.y"
          [showIncidents]="showIncidents"
          [showTime]="showTime"
          [showInstances]="showInstances"
        >
        </app-workflow-node>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .workflow-container {
        position: relative;
        border: 1px solid #ddd;
        background-color: #f9f9f9;
        min-height: 600px;
        min-width: 800px;
        overflow: hidden;
        cursor: grab;
      }

      .workflow-container:active {
        cursor: grabbing;
      }

      .workflow-canvas {
        position: relative;
        transform-origin: 0 0;
      }
    `,
  ],
})
export class WorkflowContainerComponent implements OnInit {
  @Input() workflowData!: WorkflowData;
  @Input() showIncidents = false;
  @Input() showTime = false;
  @Input() showInstances = false;

  nodeMap: Map<string, WorkflowNode> = new Map();
  canvasWidth = 1000;
  canvasHeight = 800;

  private scale = 1;
  private translateX = 0;
  private translateY = 0;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;

  private readonly minScale = 0.5;
  private readonly maxScale = 2;
  private readonly zoomFactor = 0.1;

  constructor(private readonly elementRef: ElementRef) {}

  ngOnInit() {
    this.workflowData.nodes.forEach((node) => {
      this.nodeMap.set(node.id, node);
    });
    this.calculateCanvasDimensions();
  }

  private calculateCanvasDimensions() {
    const padding = 100;
    const maxX = Math.max(
      ...this.workflowData.nodes.map((node) => node.x + NODE_CONFIG.width)
    );
    const maxY = Math.max(
      ...this.workflowData.nodes.map((node) => node.y + NODE_CONFIG.height)
    );

    this.canvasWidth = Math.max(maxX + padding, 800);
    this.canvasHeight = Math.max(maxY + padding, 600);
  }

  getTransform(): string {
    return `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
  }

  onMouseDown(event: MouseEvent): void {
    if (event.target instanceof HTMLButtonElement) return;

    this.isDragging = true;
    this.dragStartX = event.clientX - this.translateX;
    this.dragStartY = event.clientY - this.translateY;
    event.preventDefault();
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;

    window.requestAnimationFrame(() => {
      this.translateX = event.clientX - this.dragStartX;
      this.translateY = event.clientY - this.dragStartY;
    });
    event.preventDefault();
  }

  @HostListener('window:mouseup')
  onMouseUp(): void {
    this.isDragging = false;
  }

  onMouseWheel(event: WheelEvent): void {
    event.preventDefault();

    const rect = this.elementRef.nativeElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const canvasX = (mouseX - this.translateX) / this.scale;
    const canvasY = (mouseY - this.translateY) / this.scale;

    const oldScale = this.scale;
    if (event.deltaY < 0) {
      this.scale = Math.min(this.scale + this.zoomFactor, this.maxScale);
    } else {
      this.scale = Math.max(this.scale - this.zoomFactor, this.minScale);
    }

    if (this.scale !== oldScale) {
      window.requestAnimationFrame(() => {
        this.translateX = mouseX - canvasX * this.scale;
        this.translateY = mouseY - canvasY * this.scale;
      });
    }
  }
}
