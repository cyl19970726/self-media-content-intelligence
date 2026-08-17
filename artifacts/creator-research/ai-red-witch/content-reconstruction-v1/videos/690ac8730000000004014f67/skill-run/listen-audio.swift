import Foundation
import AVFoundation
import SoundAnalysis

final class Observer: NSObject, SNResultsObserving {
    var windows: [[String: Any]] = []

    func request(_ request: SNRequest, didProduce result: SNResult) {
        guard let result = result as? SNClassificationResult else { return }
        let start = CMTimeGetSeconds(result.timeRange.start)
        let duration = CMTimeGetSeconds(result.timeRange.duration)
        let classifications = result.classifications.prefix(8).map { item in
            ["label": item.identifier, "confidence": item.confidence] as [String: Any]
        }
        windows.append([
            "start": start,
            "end": start + duration,
            "classifications": classifications
        ])
    }

    func request(_ request: SNRequest, didFailWithError error: Error) {
        fputs("SoundAnalysis failed: \(error)\n", stderr)
    }

    func requestDidComplete(_ request: SNRequest) {}
}

guard CommandLine.arguments.count == 3 else {
    fputs("usage: swift listen-audio.swift INPUT_AUDIO OUTPUT_JSON\n", stderr)
    exit(2)
}

let input = URL(fileURLWithPath: CommandLine.arguments[1])
let output = URL(fileURLWithPath: CommandLine.arguments[2])
let analyzer = try SNAudioFileAnalyzer(url: input)
let request = try SNClassifySoundRequest(classifierIdentifier: .version1)
request.windowDuration = CMTime(seconds: 1.0, preferredTimescale: 600)
request.overlapFactor = 0.5
let observer = Observer()
try analyzer.add(request, withObserver: observer)
analyzer.analyze()

let payload: [String: Any] = [
    "schemaVersion": "bounded-audio-listen-1.0",
    "input": input.path,
    "method": "Apple SoundAnalysis SNClassifySoundRequest version1; 1.0-second windows; 0.5 overlap; complete-file audio-sample analysis",
    "windowCount": observer.windows.count,
    "windows": observer.windows,
    "limitations": [
        "分类标签是机器听检提议，不是音乐曲名、音效来源或版权证明。",
        "置信度会受连续人声和背景音乐重叠影响；阶段观察需结合 SRT 时间和完整窗口序列。"
    ]
]

let data = try JSONSerialization.data(withJSONObject: payload, options: [.prettyPrinted, .sortedKeys])
try data.write(to: output, options: .atomic)
print("output=\(output.path) windows=\(observer.windows.count)")
