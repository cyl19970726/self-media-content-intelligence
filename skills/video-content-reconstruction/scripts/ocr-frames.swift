#!/usr/bin/env swift
import Foundation
import Vision

struct Manifest: Decodable {
    struct Frame: Decodable {
        let id: String
        let actionId: String
        let time: Double
        let frame: String
    }
    let frames: [Frame]
}

struct OCRLine: Encodable {
    let id: String
    let text: String
    let confidence: Float
    let boundingBox: [Double]
}

struct OCRFrame: Encodable {
    let frameId: String
    let actionId: String
    let time: Double
    let sourceFrame: String
    let status: String
    let lines: [OCRLine]
    let error: String?
}

struct OCROutput: Encodable {
    let schemaVersion: String
    let generatedAt: String
    let manifest: String
    let recognitionLanguages: [String]
    let frames: [OCRFrame]
}

func argument(_ name: String) -> String? {
    guard let index = CommandLine.arguments.firstIndex(of: name), index + 1 < CommandLine.arguments.count else { return nil }
    return CommandLine.arguments[index + 1]
}

guard let manifestRaw = argument("--manifest"), let outRaw = argument("--out") else {
    FileHandle.standardError.write(Data("Usage: swift ocr-frames.swift --manifest targeted-evidence.json --out ocr-evidence.json\n".utf8))
    exit(2)
}

let manifestURL = URL(fileURLWithPath: manifestRaw).standardizedFileURL
let outputURL = URL(fileURLWithPath: outRaw).standardizedFileURL
let manifest = try JSONDecoder().decode(Manifest.self, from: Data(contentsOf: manifestURL))
let baseURL = manifestURL.deletingLastPathComponent()
let languages = ["zh-Hans", "en-US"]
var outputs: [OCRFrame] = []
var lineNumber = 0

for frame in manifest.frames {
    let imageURL = baseURL.appendingPathComponent(frame.frame)
    do {
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true
        request.recognitionLanguages = languages
        let handler = VNImageRequestHandler(url: imageURL, options: [:])
        try handler.perform([request])
        let observations = (request.results ?? []).sorted {
            if abs($0.boundingBox.maxY - $1.boundingBox.maxY) > 0.02 { return $0.boundingBox.maxY > $1.boundingBox.maxY }
            return $0.boundingBox.minX < $1.boundingBox.minX
        }
        let lines: [OCRLine] = observations.compactMap { observation in
            guard let candidate = observation.topCandidates(1).first else { return nil }
            lineNumber += 1
            let box = observation.boundingBox
            return OCRLine(
                id: String(format: "OCR-%05d", lineNumber),
                text: candidate.string,
                confidence: candidate.confidence,
                boundingBox: [Double(box.minX), Double(box.minY), Double(box.width), Double(box.height)]
            )
        }
        outputs.append(OCRFrame(frameId: frame.id, actionId: frame.actionId, time: frame.time, sourceFrame: frame.frame, status: "processed", lines: lines, error: nil))
    } catch {
        outputs.append(OCRFrame(frameId: frame.id, actionId: frame.actionId, time: frame.time, sourceFrame: frame.frame, status: "failed", lines: [], error: String(describing: error)))
    }
}

let formatter = ISO8601DateFormatter()
let payload = OCROutput(schemaVersion: "ocr-evidence-1.0", generatedAt: formatter.string(from: Date()), manifest: manifestURL.path, recognitionLanguages: languages, frames: outputs)
let encoder = JSONEncoder()
encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
let data = try encoder.encode(payload)
try FileManager.default.createDirectory(at: outputURL.deletingLastPathComponent(), withIntermediateDirectories: true)
try data.write(to: outputURL, options: .atomic)
print("output=" + outputURL.path + " frames=" + String(outputs.count) + " lines=" + String(lineNumber) + " failed=" + String(outputs.filter { $0.status == "failed" }.count))
