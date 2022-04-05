import * as clientPredictor from './clientPrediction';
import * as serverPredictor from './serverPrediction';

export async function toggleStrategy(model, i, outputCanvas, segmentationSwitch, serverSwitch) {
    switch (serverSwitch) {
        case true:
            serverPredictor.predictionRequest(model, i, outputCanvas, segmentationSwitch);
            break;
        case false:
            console.log('que esta pasando', segmentationSwitch);
            clientPredictor.predictImage(model, i, outputCanvas, segmentationSwitch);
            break;
        default:
            console.log('Server switch not initialized');
            break;
    }
}