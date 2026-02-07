import { Composition } from "remotion";
import { IntroScene } from "./scenes/IntroScene";
import { DashboardScene } from "./scenes/DashboardScene";
import { PipelineScene } from "./scenes/PipelineScene";
import { IntegrationsScene } from "./scenes/IntegrationsScene";
import { CalendarScene } from "./scenes/CalendarScene";
import { OutroScene } from "./scenes/OutroScene";
import { SalesVideoComposition } from "./scenes/SalesVideoScene";

// Full video composition
import { AbsoluteFill, Series } from "remotion";

const GameSalesDemo = () => {
    return (
        <AbsoluteFill>
            <Series>
                <Series.Sequence durationInFrames={120}>
                    <IntroScene />
                </Series.Sequence>
                <Series.Sequence durationInFrames={100}>
                    <DashboardScene />
                </Series.Sequence>
                <Series.Sequence durationInFrames={100}>
                    <PipelineScene />
                </Series.Sequence>
                <Series.Sequence durationInFrames={90}>
                    <IntegrationsScene />
                </Series.Sequence>
                <Series.Sequence durationInFrames={90}>
                    <CalendarScene />
                </Series.Sequence>
                <Series.Sequence durationInFrames={120}>
                    <OutroScene />
                </Series.Sequence>
            </Series>
        </AbsoluteFill>
    );
};

export const RemotionRoot: React.FC = () => {
    return (
        <>
            {/* Full Demo Video - ~20 seconds */}
            <Composition
                id="GameSalesDemo"
                component={GameSalesDemo}
                durationInFrames={620}
                fps={30}
                width={1920}
                height={1080}
            />

            {/* Individual Scenes for preview/testing */}
            <Composition
                id="Intro"
                component={IntroScene}
                durationInFrames={120}
                fps={30}
                width={1920}
                height={1080}
            />
            <Composition
                id="Dashboard"
                component={DashboardScene}
                durationInFrames={100}
                fps={30}
                width={1920}
                height={1080}
            />
            <Composition
                id="Pipeline"
                component={PipelineScene}
                durationInFrames={100}
                fps={30}
                width={1920}
                height={1080}
            />
            <Composition
                id="Integrations"
                component={IntegrationsScene}
                durationInFrames={90}
                fps={30}
                width={1920}
                height={1080}
            />
            <Composition
                id="Calendar"
                component={CalendarScene}
                durationInFrames={90}
                fps={30}
                width={1920}
                height={1080}
            />
            <Composition
                id="Outro"
                component={OutroScene}
                durationInFrames={120}
                fps={30}
                width={1920}
                height={1080}
            />

            {/* Sales Video - Professional marketing video ~33 seconds */}
            <Composition
                id="SalesVideo"
                component={SalesVideoComposition}
                durationInFrames={1005}
                fps={30}
                width={1920}
                height={1080}
            />
        </>
    );
};
