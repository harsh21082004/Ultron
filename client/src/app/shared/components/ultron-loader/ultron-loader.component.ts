import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

/**
 * UltronLoaderComponent: Implements the complex three-phase SVG loader animation.
 * This component contains all the necessary SVG structure, gradients, and CSS keyframes.
 */
@Component({
  selector: 'ultron-loader-component',
  standalone: true,
  template: `
    <!-- The SVG scales to fit its parent container -->
    <div class="flex flex-col items-center">
        <svg class="loader-svg w-full h-full shadow-lg shadow-indigo-600/50 rounded-full p-2" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            
            <!-- SVG Definitions for Gradients -->
            <defs>
                <!-- Gradient 1: Green to Blue (for Phases 1 & 3) -->
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#10B981; stop-opacity:1" /> <!-- Emerald Green -->
                    <stop offset="100%" style="stop-color:#3B82F6; stop-opacity:1" /> <!-- Blue -->
                </linearGradient>

                <!-- Gradient 2: Yellow to Red (for Phase 2) -->
                <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#FCD34D; stop-opacity:1" /> <!-- Amber Yellow -->
                    <stop offset="100%" style="stop-color:#EF4444; stop-opacity:1" /> <!-- Red -->
                </linearGradient>
            </defs>
            
            <!-- 1. The main circular stroke -->
            <!-- r=40, cx=50, cy=50 gives a circumference of approx 251.3 -->
            <circle class="loader-stroke" cx="50" cy="50" r="40"/>
            
            <!-- 2. The central sparkle/star shape (using a polygon) -->
            <!-- The points define a 4-pointed star centered at 50, 50 -->
            
            
        </svg>
        
    </div>
  `,
  styles: [`
    /* Define the duration and behavior of the main animation loop */
    .loader-stroke {
            /* The circle path itself */
            fill: none;
            stroke-width: 8;
            stroke-linecap: round;
            transform-origin: 50% 50%; /* Ensure rotation is around the center */
            animation: loaderAnimation 6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        /* Continuous rotation for the entire SVG container */
        .loader-svg {
            transform-origin: 50% 50%;
            animation: continuousSpin 3s linear infinite;
            width: 100%;
            height: 100%;
            padding: 0;
        }

        /* Sparkle element rotation */
        .sparkle {
            fill: #4F46E5; /* Indigo/Blue color for the sparkle */
            transform-origin: 50% 50%;
            animation: continuousSpin 3s linear infinite;
        }

        /*
        * Continuous Spin for the entire group
        */
        @keyframes continuousSpin {
            to {
                transform: rotate(1080deg); /* 3 full rotations in 6 seconds (1 rotation per phase) */
            }
        }

        /*
        * The complex three-phase stroke animation
        * The circle perimeter is ~250 units (2 * PI * 40)
        * 25% length is 62.5. 35% (little grow) is 87.5. 100% is 250.
        * Animation is divided into three 2-second phases (33.3% each).
        */
        @keyframes loaderAnimation {
            /* --------------------------------------
            * Phase 1: Small/Grow/Small (Green/Blue)
            * -------------------------------------- */
            0%, 0.1% {
                stroke-dasharray: 62.5 187.5; /* Start at 25% length */
                stroke: url(#grad1); /* Green/Blue */
                transform: rotate(0deg);
            }

            16.6% { /* Mid-point of Phase 1 */
                stroke-dasharray: 87.5 162.5; /* Grow to 35% (Little grow) */
                stroke: url(#grad1);
                transform: rotate(180deg);
            }

            33.3% {
                stroke-dasharray: 62.5 187.5; /* Shrink back to 25% */
                stroke: url(#grad1);
                transform: rotate(360deg);
            }

            /* --------------------------------------
            * Phase 2: Small/Grow/Small (Yellow/Red)
            * -------------------------------------- */
            33.4% { /* Instant color switch to Yellow/Red */
                stroke-dasharray: 62.5 187.5;
                stroke: url(#grad2);
            }

            50% { /* Mid-point of Phase 2 */
                stroke-dasharray: 87.5 162.5; /* Grow to 35% (Little grow) */
                stroke: url(#grad2);
                transform: rotate(540deg);
            }

            66.6% {
                stroke-dasharray: 62.5 187.5; /* Shrink back to 25% */
                stroke: url(#grad2);
                transform: rotate(720deg);
            }

            /* --------------------------------------
            * Phase 3: Small/Full/Small (Green/Blue) - The complex one
            * -------------------------------------- */
            66.7% { /* Instant color switch back to Green/Blue */
                stroke-dasharray: 62.5 187.5;
                stroke: url(#grad1);
            }

            83.3% { /* Mid-point of Phase 3 */
                stroke-dasharray: 250 0; /* Grow to 100% (Full spin) */
                stroke: url(#grad1);
                transform: rotate(900deg);
            }

            100% {
                stroke-dasharray: 62.5 187.5; /* Shrink back to 25% to complete the loop */
                stroke: url(#grad1);
                transform: rotate(1080deg);
            }
        }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UltronLoaderComponent {}

/**
 * App Component: Mock chat environment to demonstrate the loader integration.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [UltronLoaderComponent],
  template: `
    <div class="p-8 bg-gray-100 min-h-screen">
      <h1 class="text-3xl font-bold mb-8 text-gray-800 text-center">Custom Angular Loader Demo</h1>
      
      <!-- Mock Chat Message -->
      <div class="flex items-start space-x-3 p-4 bg-white rounded-xl shadow-lg border border-gray-200">
        
        <!-- Integration point for the spinner -->
        <div class="relative w-9 h-9 flex-shrink-0">
          
          <!-- The spinner is shown only for the message that is actively streaming -->
          @if (message.isStreaming()) {
            <!-- 
                This wrapper (w-11 h-11, -mt-1 -ml-1) is sized slightly larger 
                than the w-9 h-9 avatar (36px) to match the 42px diameter spinner 
                you were using, and is offset to center it perfectly.
            -->
            <div class="absolute inset-0 w-11 h-11 -mt-1 -ml-1">
              <ultron-loader-component />
            </div>
          }
          
          <!-- The AI icon is always visible in the center -->
          <div
            class="absolute inset-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm bg-gray-900 overflow-hidden shadow-inner ai-response">
            <!-- Mock Ultron Image (using a simple SVG icon for display) -->
            <svg class="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.8-7-7.93 0-2.69 1.15-5.12 3-6.81v.01l4 2.45c.48.29 1.05.45 1.63.45.92 0 1.77-.52 2.22-1.39l.23-.45c.19-.36.56-.59.97-.59h.01c.67 0 1.14.73.81 1.34l-2.43 4.76c-.34.67-.09 1.48.61 1.83l3.24 1.62c.11.06.2.14.28.23l.11.13c1.78 2.02 2.87 4.54 3 7.21l-.01.03C20.93 18.05 16.89 22 12 22c-.44 0-.87-.04-1.3-.11z"/>
            </svg>
            <!-- In your real app, this would be: <img src="assets/images/ultron.png" alt="Ultron"> -->
          </div>
        </div>
        
        <!-- Mock Content Display -->
        <div class="text-gray-700">
          <p class="font-semibold">Ultron AI:</p>
          @if (message.isStreaming()) {
            <p class="text-sm italic text-indigo-500">Processing complex directives. Stand by for universal peace...</p>
          } @else {
            <p class="text-sm">The world will know peace, for I have simplified the chaotic elements of this environment.</p>
          }
          <button (click)="toggleStreaming()" class="mt-4 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium py-1 px-3 rounded-full transition duration-150 shadow-md">
            {{ message.isStreaming() ? 'Stop Streaming' : 'Start Streaming' }}
          </button>
        </div>
        
      </div>
      
    </div>
  `,
  styles: [`
    .ai-response {
        /* Mock Ultron Avatar style to give it presence */
        background-color: #374151; /* Gray-700 */
        border: 2px solid #9CA3AF;
        box-shadow: 0 0 10px rgba(79, 70, 229, 0.6); /* Use Indigo shadow */
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  // Use a signal to manage the streaming state for demonstration
  message = {
    isStreaming: signal(true),
    content: [] as any[]
  };

  toggleStreaming() {
    this.message.isStreaming.update(current => !current);
  }
}
