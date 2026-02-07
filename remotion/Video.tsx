import { AbsoluteFill, Sequence } from "remotion";
import { IntroScene } from "./scenes/IntroScene";
import { DashboardScene } from "./scenes/DashboardScene";
import { KanbanScene } from "./scenes/KanbanScene";

export const GameSalesVideo: React.FC = () => {
    return (
        <AbsoluteFill style={{ backgroundColor: "#0f0a1e" }}>
            {/* Intro: 0-3s (frames 0-89) */}
            <Sequence from={0} durationInFrames={90}>
                <IntroScene />
            </Sequence>

            {/* Dashboard: 3-8s (frames 90-239) */}
            <Sequence from={90} durationInFrames={150}>
                <DashboardScene />
            </Sequence>

            {/* Kanban: 8-13s (frames 240-389) */}
            <Sequence from={240} durationInFrames={150}>
                <KanbanScene />
            </Sequence>
        </AbsoluteFill>
    );
};
