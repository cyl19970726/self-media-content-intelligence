import Foundation
import AVFoundation
import SoundAnalysis

final class Observer: NSObject, SNResultsObserving {
    private let done: DispatchSemaphore

    init(done: DispatchSemaphore) {
        self.done = done
    }

    func request(_ request: SNRequest, didProduce result: SNResult) {
        guard let result = result as? SNClassificationResult else { return }
        let start = result.timeRange.start.seconds
        let duration = result.timeRange.duration.seconds
        let rows = result.classifications
            .filter { $0.confidence >= 0.01 }
            .prefix(12)
            .map { String(format: "%@=%.4f", $0.identifier, $0.confidence) }
            .joined(separator: "\t")
        let waterTerms = ["water", "liquid", "stream", "faucet", "sink", "shower", "rain", "ocean", "wave", "river"]
        let waterRows = result.classifications
            .filter { row in waterTerms.contains { row.identifier.localizedCaseInsensitiveContains($0) } }
            .prefix(12)
            .map { String(format: "%@=%.6f", $0.identifier, $0.confidence) }
            .joined(separator: ",")
        print(String(format: "%.3f\t%.3f\t%@\tWATER_TARGETS:%@", start, duration, rows, waterRows))
    }

    func request(_ request: SNRequest, didFailWithError error: Error) {
        fputs("classification_failed\t\(error)\n", stderr)
        done.signal()
    }

    func requestDidComplete(_ request: SNRequest) {
        done.signal()
    }
}

guard CommandLine.arguments.count == 2 else {
    fputs("usage: swift sound-classify.swift /absolute/path/audio\n", stderr)
    exit(2)
}

let audioURL = URL(fileURLWithPath: CommandLine.arguments[1])
let analyzer = try SNAudioFileAnalyzer(url: audioURL)
let request = try SNClassifySoundRequest(classifierIdentifier: .version1)
request.windowDuration = CMTime(seconds: 0.5, preferredTimescale: 48_000)
request.overlapFactor = 0.5
let done = DispatchSemaphore(value: 0)
let observer = Observer(done: done)
try analyzer.add(request, withObserver: observer)
analyzer.analyze()
_ = done.wait(timeout: .now() + 120)
