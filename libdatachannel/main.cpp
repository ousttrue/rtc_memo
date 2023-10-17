#include "rtc/rtc.hpp"
#include <iostream>
#include <memory>
#include <sstream>

std::shared_ptr<rtc::DataChannel> g_dc;

int main() {
  std::cout << "input offer sdp..." << std::endl;

  rtc::Configuration config;

  // READ SDP from stdin
  auto pc = std::make_shared<rtc::PeerConnection>(config);

  pc->onStateChange([](rtc::PeerConnection::State state) {
    std::cout << "State: " << state << std::endl;
  });

  pc->onGatheringStateChange([](rtc::PeerConnection::GatheringState state) {
    // std::cout << "Gathering State: " << state << std::endl;
  });

  pc->onLocalDescription([](rtc::Description description) {
    // std::cout << "Local Description (Paste this to the other peer):" <<
    // std::endl;
    std::cout << std::string(description);
  });

  pc->onLocalCandidate([](rtc::Candidate candidate) {
    // std::cout << "Local Candidate (Paste this to the other peer after the
    // local description):" << std::endl;
    std::cout << std::string(candidate) << std::endl;
  });

  pc->onDataChannel([](std::shared_ptr<rtc::DataChannel> dc) {
    g_dc = dc;
    // std::cout << " received with label \"" << dc->label() << "\"" <<
    // std::endl;

    // dc->onOpen([wdc]() {
    // 	if (auto dc = wdc.lock())
    // 		dc->send("Hello");
    // });

    dc->onClosed([]() { std::cout << " closed" << std::endl; });

    dc->onMessage([](auto data) {
      // data holds either std::string or rtc::binary
      if (std::holds_alternative<std::string>(data))
        std::cout << " received: " << std::get<std::string>(data) << std::endl;
      else
        std::cout << " received, size=" << std::get<rtc::binary>(data).size()
                  << std::endl;
    });
  });

  // WRITE answer SDP
  std::stringstream ss;

  std::string line;
  while (std::getline(std::cin, line) && !line.empty()) {
    ss << line << std::endl;
  }

  auto offerspd = ss.str();

  // std::cout << offerspd << std::endl;
  pc->setRemoteDescription(offerspd);

  // puts each msg
  std::cout << "enter to exit..." << std::endl;
  int command = -1;
  std::cin >> command;
  std::cin.ignore();

  return 0;
}
