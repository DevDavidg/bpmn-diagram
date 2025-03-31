import {
  Component,
  Input,
  OnInit,
  AfterViewInit,
  ElementRef,
  ChangeDetectorRef,
  NgZone,
} from '@angular/core';
import {
  WorkflowTransition,
  WorkflowNode,
  NODE_CONFIG,
  CONNECTION_CONFIG,
} from '../../models/workflow.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-workflow-connection',
  standalone: true,
  imports: [CommonModule],
  host: {
    '[style.position]': '"absolute"',
    '[style.width.px]': 'width',
    '[style.height.px]': 'height',
    '[style.left.px]': 'left',
    '[style.top.px]': 'top',
    '[style.z-index]': 'zIndex',
  },
  template: `
    <svg class="connection" [attr.width]="width" [attr.height]="height">
      <path
        [attr.d]="pathData"
        stroke="#666"
        stroke-width="2"
        fill="none"
        [attr.marker-end]="'url(#arrow-' + transition.idTransition + ')'"
      ></path>
      <defs>
        <marker
          [attr.id]="'arrow-' + transition.idTransition"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#666"></path>
        </marker>
      </defs>
      <rect
        *ngIf="showTransitionName"
        [attr.x]="textX - textWidth / 2 - 6"
        [attr.y]="textY - 35"
        [attr.width]="textWidth + 12"
        [attr.height]="30"
        fill="white"
        stroke="#e0e0e0"
        stroke-width="1"
        opacity="1"
        rx="5"
        ry="5"
        class="text-background"
      ></rect>
      <text
        *ngIf="showTransitionName"
        [attr.x]="textX"
        [attr.y]="textY - 20"
        text-anchor="middle"
        alignment-baseline="middle"
        class="transition-name"
      >
        {{ transition.trName }}
      </text>
    </svg>
  `,
  styles: [
    `
      .connection {
        pointer-events: none;
        overflow: visible;
      }
      .text-background {
        pointer-events: none;
      }
      .transition-name {
        font-size: 12px;
        fill: #333;
        pointer-events: none;
        z-index: 2;
        font-weight: bold;
      }
    `,
  ],
})
export class ConnectionComponent implements OnInit, AfterViewInit {
  @Input() transition!: WorkflowTransition;
  @Input() nodes!: Map<string, WorkflowNode>;

  left = 0;
  top = 0;
  width = CONNECTION_CONFIG.minWidth;
  height = CONNECTION_CONFIG.minHeight;
  pathData = '';
  showTransitionName = true;
  zIndex = CONNECTION_CONFIG.zIndex;
  textX = 0;
  textY = 0;
  textWidth = 0;

  private readonly CORNER_RADIUS = 15;
  private readonly MIN_SEGMENT_LENGTH = 100;
  private readonly TEXT_PADDING = 25;

  constructor(
    private readonly elementRef: ElementRef,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly ngZone: NgZone
  ) {}

  ngOnInit() {
    this.calculateConnectionPoints();
    this.calculateTextWidth();
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.ngZone.run(() => {
          this.updateWithActualNodeSizes();
          this.calculateTextWidth();
        });
      }, 200);
    });
  }

  private calculateTextWidth() {
    if (this.transition.trName) {
      this.textWidth = this.transition.trName.length * 7;
    } else {
      this.textWidth = 0;
      this.showTransitionName = false;
    }
  }

  private updateWithActualNodeSizes() {
    const fromNode = this.nodes.get(this.transition.idTaskFrom);
    const toNode = this.nodes.get(this.transition.idTaskTo);

    if (!fromNode || !toNode) {
      return;
    }

    const fromNodeElement = this.findNodeElement(fromNode.id);
    const toNodeElement = this.findNodeElement(toNode.id);

    if (fromNodeElement && toNodeElement) {
      const fromHeight = fromNodeElement.offsetHeight;
      const toHeight = toNodeElement.offsetHeight;

      this.calculateConnectionPointsWithActualHeights(
        fromNode,
        toNode,
        fromHeight,
        toHeight
      );

      this.changeDetector.detectChanges();
    }
  }

  private findNodeElement(nodeId: string): HTMLElement | null {
    const workflow = this.elementRef.nativeElement.closest('.workflow-canvas');
    if (!workflow) return null;

    return (
      workflow.querySelector(`[data-node-id="${nodeId}"] .node`) ||
      workflow.querySelector(`.node[data-node-id="${nodeId}"]`) ||
      workflow.querySelector(
        `app-workflow-node[data-node-id="${nodeId}"] .node`
      )
    );
  }

  private calculateConnectionPoints() {
    const fromNode = this.nodes.get(this.transition.idTaskFrom);
    const toNode = this.nodes.get(this.transition.idTaskTo);

    if (!fromNode || !toNode) {
      return;
    }

    const nodeHeight = NODE_CONFIG.height;

    this.calculateConnectionPointsWithActualHeights(
      fromNode,
      toNode,
      nodeHeight,
      nodeHeight
    );
  }

  private calculateConnectionPointsWithActualHeights(
    fromNode: WorkflowNode,
    toNode: WorkflowNode,
    fromNodeHeight: number,
    toNodeHeight: number
  ) {
    const nodeWidth = NODE_CONFIG.width;

    const fromCenterX = fromNode.x + nodeWidth / 2;
    const fromCenterY = fromNode.y + fromNodeHeight / 2;
    const toCenterX = toNode.x + nodeWidth / 2;
    const toCenterY = toNode.y + toNodeHeight / 2;

    const dx = toCenterX - fromCenterX;
    const dy = toCenterY - fromCenterY;
    const isHorizontal = Math.abs(dx) > Math.abs(dy);

    let startX, startY, endX, endY;
    let padding = this.MIN_SEGMENT_LENGTH;

    if (isHorizontal) {
      startY = fromCenterY;
      endY = toCenterY;

      if (dx > 0) {
        startX = fromNode.x + nodeWidth;
        endX = toNode.x;
      } else {
        startX = fromNode.x;
        endX = toNode.x + nodeWidth;
      }
    } else {
      startX = fromCenterX;
      endX = toCenterX;

      if (dy > 0) {
        startY = fromNode.y + fromNodeHeight;
        endY = toNode.y;
      } else {
        startY = fromNode.y;
        endY = toNode.y + toNodeHeight;
      }
    }

    const pathPoints: [number, number][] = [];
    pathPoints.push([startX, startY]);

    if (isHorizontal) {
      const midX = (startX + endX) / 2;

      if (Math.abs(startY - endY) > this.MIN_SEGMENT_LENGTH) {
        pathPoints.push([midX, startY]);
        pathPoints.push([midX, endY]);
      } else if (Math.abs(dx) < this.MIN_SEGMENT_LENGTH * 2) {
        const offsetY = Math.max(Math.abs(dx) / 2, this.MIN_SEGMENT_LENGTH);
        const midY = (startY + endY) / 2;
        const direction = startY > endY ? -1 : 1;

        pathPoints.push([startX + 40, startY]);
        pathPoints.push([startX + 40, midY + direction * offsetY]);
        pathPoints.push([endX - 40, midY + direction * offsetY]);
        pathPoints.push([endX - 40, endY]);
      }
    } else {
      const midY = (startY + endY) / 2;

      if (Math.abs(startX - endX) > this.MIN_SEGMENT_LENGTH) {
        pathPoints.push([startX, midY]);
        pathPoints.push([endX, midY]);
      } else if (Math.abs(dy) < this.MIN_SEGMENT_LENGTH * 2) {
        const offsetX = Math.max(Math.abs(dy) / 2, this.MIN_SEGMENT_LENGTH);
        const midX = (startX + endX) / 2;
        const direction = startX > endX ? -1 : 1;

        pathPoints.push([startX, startY + 40]);
        pathPoints.push([midX + direction * offsetX, startY + 40]);
        pathPoints.push([midX + direction * offsetX, endY - 40]);
        pathPoints.push([endX, endY - 40]);
      }
    }

    if (pathPoints.length === 1) {
      if (isHorizontal) {
        pathPoints.push([endX, startY]);
      } else {
        pathPoints.push([startX, endY]);
      }
    }

    pathPoints.push([endX, endY]);

    const allX = pathPoints.map(p => p[0]);
    const allY = pathPoints.map(p => p[1]);

    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY);

    const padX = this.CORNER_RADIUS + padding;
    const padY = this.CORNER_RADIUS + padding;

    this.left = minX - padX;
    this.top = minY - padY;
    this.width = Math.max(maxX - minX + 2 * padX, 50);
    this.height = Math.max(maxY - minY + 2 * padY, 50);

    const adjustedPoints = pathPoints.map(
      ([x, y]) => [x - this.left, y - this.top] as [number, number]
    );

    this.pathData = this.createPathWithCurvedCorners(adjustedPoints);

    if (adjustedPoints.length >= 3) {
      const pathMiddleIndex = Math.floor(adjustedPoints.length / 2) - 1;
      const [x1, y1] = adjustedPoints[pathMiddleIndex];
      const [x2, y2] = adjustedPoints[pathMiddleIndex + 1];

      this.textX = (x1 + x2) / 2;
      this.textY = (y1 + y2) / 2;

      const segmentLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      if (segmentLength < this.textWidth + 2 * this.TEXT_PADDING) {
        if (Math.abs(x2 - x1) > Math.abs(y2 - y1)) {
          this.textY = (y1 + y2) / 2 - 20;
        } else {
          this.textX = (x1 + x2) / 2 + 20;
        }
      }
    } else if (adjustedPoints.length === 2) {
      const [x1, y1] = adjustedPoints[0];
      const [x2, y2] = adjustedPoints[1];

      this.textX = (x1 + x2) / 2;
      this.textY = (y1 + y2) / 2;

      if (Math.abs(x2 - x1) > Math.abs(y2 - y1)) {
        this.textY -= 15;
      } else {
        this.textX += 15;
      }
    } else {
      this.textX = this.width / 2;
      this.textY = this.height / 2;
    }
  }

  private createPathWithCurvedCorners(points: [number, number][]): string {
    if (points.length < 2) return '';

    const radius = this.CORNER_RADIUS;
    let pathData = `M ${points[0][0]} ${points[0][1]}`;

    for (let i = 1; i < points.length; i++) {
      const current = points[i];
      const prev = points[i - 1];

      if (points.length > 2 && i < points.length - 1 && i > 0) {
        const next = points[i + 1];

        const inDir = [current[0] - prev[0], current[1] - prev[1]];
        const outDir = [next[0] - current[0], next[1] - current[1]];

        const inLength = Math.sqrt(inDir[0] ** 2 + inDir[1] ** 2);
        const outLength = Math.sqrt(outDir[0] ** 2 + outDir[1] ** 2);

        if (inLength === 0 || outLength === 0) {
          pathData += ` L ${current[0]} ${current[1]}`;
          continue;
        }

        const inDirNorm = [inDir[0] / inLength, inDir[1] / inLength];
        const outDirNorm = [outDir[0] / outLength, outDir[1] / outLength];

        const curveStartX = current[0] - inDirNorm[0] * Math.min(radius, inLength / 2);
        const curveStartY = current[1] - inDirNorm[1] * Math.min(radius, inLength / 2);
        const curveEndX = current[0] + outDirNorm[0] * Math.min(radius, outLength / 2);
        const curveEndY = current[1] + outDirNorm[1] * Math.min(radius, outLength / 2);

        pathData += ` L ${curveStartX} ${curveStartY}`;
        pathData += ` Q ${current[0]} ${current[1]}, ${curveEndX} ${curveEndY}`;
      } else {
        pathData += ` L ${current[0]} ${current[1]}`;
      }
    }

    return pathData;
  }
}
