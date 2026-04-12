FROM python:3.11-slim

LABEL maintainer="BioCompute Platform"
LABEL description="AutoDock Vina 1.2.5 JSON API for molecular docking"

# Install system dependencies + AutoDock Vina
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget ca-certificates libboost-all-dev swig \
    openbabel libopenbabel-dev python3-openbabel \
    && rm -rf /var/lib/apt/lists/*

# Install Vina 1.2.5 binary
RUN wget -q https://github.com/ccsb-scripps/AutoDock-Vina/releases/download/v1.2.5/vina_1.2.5_linux_x86_64 \
    -O /usr/local/bin/vina && chmod +x /usr/local/bin/vina

# Install MGLTools for receptor/ligand preparation (PDBQT conversion)
RUN wget -q https://ccsb.scripps.edu/adfr/download/1038/ -O /tmp/adfr.tar.gz \
    && tar xzf /tmp/adfr.tar.gz -C /opt/ \
    && rm /tmp/adfr.tar.gz || true

# Python dependencies
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

WORKDIR /app
COPY . /app/

# Create data directories
RUN mkdir -p /data /out /tmp/docking

EXPOSE 8080

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["server"]
